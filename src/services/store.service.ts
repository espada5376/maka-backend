import { Knex } from "knex";

import {
  Store,
  StoreRepository,
} from "../database/repositories/store.repository.js";

import { SessionRepository } from "../database/repositories/session.repository.js";
import { EventRepository } from "../database/repositories/event.repository.js";

import { Errors } from "../common/errors/errors.js";
import { createAppError } from "../common/errors/create-app-error.js";

const PLATFORM_CURRENCY = "XOF";

export interface CreateStoreInput {
  name: string;
  description?: string | null;
  country: string;
  city: string;
}

export interface UpdateStoreInput {
  name?: string;
  description?: string | null;
  country?: string;
  city?: string;
}

export interface IStoreService {
  create(sessionId: string, input: CreateStoreInput): Promise<Store>;

  getById(storeId: string): Promise<Store>;

  getByOwnerId(ownerId: string): Promise<Store | null>;

  update(
    sessionId: string,
    storeId: string,
    input: UpdateStoreInput,
  ): Promise<Store>;

  activate(sessionId: string, storeId: string): Promise<Store>;

  deactivate(sessionId: string, storeId: string): Promise<Store>;
}

export class StoreService implements IStoreService {
  constructor(
      private readonly database: Knex,
  private readonly storeRepository: StoreRepository,
  private readonly sessionRepository: SessionRepository,
  ) {}

  // ---------------------------------------------------------------------------
  // Session validation
  // ---------------------------------------------------------------------------

  private async getAuthenticatedSession(sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw createAppError(Errors.SESSION_NOT_FOUND);
    }

    if (session.expires_at <= new Date()) {
      throw createAppError(Errors.SESSION_EXPIRED);
    }

    if (!session.user_id) {
      throw createAppError(Errors.STORE_FORBIDDEN);
    }

    return session;
  }

  // ---------------------------------------------------------------------------
  // Store validation
  // ---------------------------------------------------------------------------

  private validateName(name: string): string {
    const normalizedName = name.trim();

    if (normalizedName.length === 0 || normalizedName.length > 100) {
      throw createAppError(Errors.INVALID_STORE);
    }

    return normalizedName;
  }

  private validateCountry(country: string): string {
    const normalizedCountry = country.trim().toUpperCase();

    if (normalizedCountry.length !== 2) {
      throw createAppError(Errors.INVALID_STORE);
    }

    return normalizedCountry;
  }

  private validateCity(city: string): string {
    const normalizedCity = city.trim();

    if (normalizedCity.length === 0 || normalizedCity.length > 100) {
      throw createAppError(Errors.INVALID_STORE);
    }

    return normalizedCity;
  }

  // ---------------------------------------------------------------------------
  // Ownership
  // ---------------------------------------------------------------------------

  private assertOwnership(store: Store, userId: string): void {
    if (store.owner_id !== userId) {
      throw createAppError(Errors.STORE_FORBIDDEN);
    }
  }

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------

  async create(sessionId: string, input: CreateStoreInput): Promise<Store> {
    const session = await this.getAuthenticatedSession(sessionId);

    const existingStore = await this.storeRepository.findByOwnerId(
      session.user_id!,
    );

    if (existingStore) {
      throw createAppError(Errors.STORE_ALREADY_EXISTS);
    }

    const name = this.validateName(input.name);
    const country = this.validateCountry(input.country);
    const city = this.validateCity(input.city);

    return this.database.transaction(async (trx) => {
      const trxStoreRepository = new StoreRepository(trx);
      const trxEventRepository = new EventRepository(trx);

      const store = await trxStoreRepository.create({
        owner_id: session.user_id!,
        name,
        description: input.description ?? null,
        country,
        city,
        currency: PLATFORM_CURRENCY,
      });

      await trxEventRepository.create({
        event_name: "store.created",
        session_id: sessionId,
        user_id: session.user_id,
        store_id: store.id,
        metadata: {},
      });

      return store;
    });
  }

  // ---------------------------------------------------------------------------
  // getById
  // ---------------------------------------------------------------------------

  async getById(storeId: string): Promise<Store> {
    const store = await this.storeRepository.findById(storeId);

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    return store;
  }

  // ---------------------------------------------------------------------------
  // getByOwnerId
  // ---------------------------------------------------------------------------

  async getByOwnerId(ownerId: string): Promise<Store | null> {
    const store = await this.storeRepository.findByOwnerId(ownerId);

    return store ?? null;
  }

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  async update(
    sessionId: string,
    storeId: string,
    input: UpdateStoreInput,
  ): Promise<Store> {
    const session = await this.getAuthenticatedSession(sessionId);

    const store = await this.storeRepository.findById(storeId);

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    this.assertOwnership(store, session.user_id!);

    const updateData: {
      name?: string;
      description?: string | null;
      country?: string;
      city?: string;
    } = {};

    if (input.name !== undefined) {
      updateData.name = this.validateName(input.name);
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.country !== undefined) {
      updateData.country = this.validateCountry(input.country);
    }

    if (input.city !== undefined) {
      updateData.city = this.validateCity(input.city);
    }

    return this.database.transaction(async (trx) => {
      const trxStoreRepository = new StoreRepository(trx);
      const trxEventRepository = new EventRepository(trx);

      const updatedStore = await trxStoreRepository.update(storeId, updateData);

      if (!updatedStore) {
        throw createAppError(Errors.STORE_NOT_FOUND);
      }

      await trxEventRepository.create({
        event_name: "store.updated",
        session_id: sessionId,
        user_id: session.user_id,
        store_id: storeId,
        metadata: {},
      });

      return updatedStore;
    });
  }

  // ---------------------------------------------------------------------------
  // activate
  // ---------------------------------------------------------------------------

  async activate(sessionId: string, storeId: string): Promise<Store> {
    const session = await this.getAuthenticatedSession(sessionId);

    const store = await this.storeRepository.findById(storeId);

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    this.assertOwnership(store, session.user_id!);

    if (store.status === "active") {
      throw createAppError(Errors.INVALID_STORE_STATUS_TRANSITION);
    }

    return this.database.transaction(async (trx) => {
      const trxStoreRepository = new StoreRepository(trx);
      const trxEventRepository = new EventRepository(trx);

      const activatedStore = await trxStoreRepository.setStatus(
        storeId,
        "active",
      );

      if (!activatedStore) {
        throw createAppError(Errors.STORE_NOT_FOUND);
      }

      await trxEventRepository.create({
        event_name: "store.activated",
        session_id: sessionId,
        user_id: session.user_id,
        store_id: storeId,
        metadata: {},
      });

      return activatedStore;
    });
  }

  // ---------------------------------------------------------------------------
  // deactivate
  // ---------------------------------------------------------------------------

  async deactivate(sessionId: string, storeId: string): Promise<Store> {
    const session = await this.getAuthenticatedSession(sessionId);

    const store = await this.storeRepository.findById(storeId);

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    this.assertOwnership(store, session.user_id!);

    if (store.status === "inactive") {
      throw createAppError(Errors.INVALID_STORE_STATUS_TRANSITION);
    }

    return this.database.transaction(async (trx) => {
      const trxStoreRepository = new StoreRepository(trx);
      const trxEventRepository = new EventRepository(trx);

      const deactivatedStore = await trxStoreRepository.setStatus(
        storeId,
        "inactive",
      );

      if (!deactivatedStore) {
        throw createAppError(Errors.STORE_NOT_FOUND);
      }

      await trxEventRepository.create({
        event_name: "store.deactivated",
        session_id: sessionId,
        user_id: session.user_id,
        store_id: storeId,
        metadata: {},
      });

      return deactivatedStore;
    });
  }
}
