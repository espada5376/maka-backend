
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";

import { StoreService } from "../../src/services/store.service.js";

import {
  StoreRepository,
  type Store,
} from "../../src/database/repositories/store.repository.js";

import { SessionRepository } from "../../src/database/repositories/session.repository.js";
import { EventRepository } from "../../src/database/repositories/event.repository.js";

describe("StoreService", () => {
  const SESSION_ID = "11111111-1111-1111-1111-111111111111";

  const STORE_ID = "44444444-4444-4444-4444-444444444444";

  const USER_ID = "88888888-8888-8888-8888-888888888888";

  const OTHER_USER_ID = "99999999-9999-9999-9999-999999999999";

  const validCreateInput = {
    name: "Ma Boutique",
    description: "Une boutique de produits de beauté",
    country: "TG",
    city: "Lomé",
  };

  const validUpdateInput = {
    name: "Ma Nouvelle Boutique",
    description: "Nouvelle description",
    country: "BJ",
    city: "Cotonou",
  };

  const mockDatabase = {
    transaction: vi.fn(),
  };

  const mocks = {
    storeRepository: {
      findById: vi.fn(),
      findByOwnerId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setStatus: vi.fn(),
    },

    sessionRepository: {
      findById: vi.fn(),
    },
  };

  let storeService: StoreService;

  let storeCreateSpy: ReturnType<typeof vi.spyOn>;
  let storeUpdateSpy: ReturnType<typeof vi.spyOn>;
  let storeSetStatusSpy: ReturnType<typeof vi.spyOn>;
  let eventCreateSpy: ReturnType<typeof vi.spyOn>;

  function createSession(overrides: Record<string, unknown> = {}) {
    return {
      id: SESSION_ID,
      user_id: USER_ID,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date(),
      ...overrides,
    };
  }

  function createStore(overrides: Record<string, unknown> = {}): Store {
    return {
      id: STORE_ID,
      owner_id: USER_ID,
      name: "Ma Boutique",
      description: "Une boutique de test",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    } as Store;
  }

  beforeEach(() => {
    vi.restoreAllMocks();

    Object.values(mocks.storeRepository).forEach((mock) => {
      mock.mockReset();
    });

    Object.values(mocks.sessionRepository).forEach((mock) => {
      mock.mockReset();
    });

    mockDatabase.transaction.mockReset();

    mockDatabase.transaction.mockImplementation(
      async (callback: (trx: Knex) => Promise<unknown>) => {
        return callback({} as Knex);
      },
    );

    storeCreateSpy = vi
      .spyOn(StoreRepository.prototype, "create")
      .mockResolvedValue(createStore());

    storeUpdateSpy = vi
      .spyOn(StoreRepository.prototype, "update")
      .mockResolvedValue(createStore());

    storeSetStatusSpy = vi
      .spyOn(StoreRepository.prototype, "setStatus")
      .mockResolvedValue(createStore());

    eventCreateSpy = vi
      .spyOn(EventRepository.prototype, "create")
      .mockResolvedValue(undefined as never);

    storeService = new StoreService(
      mockDatabase as unknown as Knex,
      mocks.storeRepository as unknown as StoreRepository,
      mocks.sessionRepository as unknown as SessionRepository,
    );
  });

  function prepareAuthenticatedSession(
    overrides: Record<string, unknown> = {},
  ) {
    mocks.sessionRepository.findById.mockResolvedValue(
      createSession(overrides),
    );
  }

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  describe("create", () => {
    it("should create a store for an authenticated session", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      const createdStore = createStore();

      storeCreateSpy.mockResolvedValue(createdStore);

      const result = await storeService.create(
        SESSION_ID,
        validCreateInput,
      );

      expect(result).toEqual(createdStore);

      expect(mocks.sessionRepository.findById).toHaveBeenCalledWith(
        SESSION_ID,
      );

      expect(mocks.storeRepository.findByOwnerId).toHaveBeenCalledWith(
        USER_ID,
      );

      expect(mockDatabase.transaction).toHaveBeenCalledTimes(1);

      expect(storeCreateSpy).toHaveBeenCalledWith({
        owner_id: USER_ID,
        name: "Ma Boutique",
        description: "Une boutique de produits de beauté",
        country: "TG",
        city: "Lomé",
        currency: "XOF",
      });
    });

    it("should normalize the store name", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await storeService.create(SESSION_ID, {
        ...validCreateInput,
        name: "  Ma Boutique  ",
      });

      expect(storeCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Ma Boutique",
        }),
      );
    });

    it("should normalize the country to uppercase", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await storeService.create(SESSION_ID, {
        ...validCreateInput,
        country: "tg",
      });

      expect(storeCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          country: "TG",
        }),
      );
    });

    it("should normalize the city", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await storeService.create(SESSION_ID, {
        ...validCreateInput,
        city: "  Lomé  ",
      });

      expect(storeCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          city: "Lomé",
        }),
      );
    });

    it("should use null when description is omitted", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await storeService.create(SESSION_ID, {
        name: validCreateInput.name,
        country: validCreateInput.country,
        city: validCreateInput.city,
      });

      expect(storeCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        }),
      );
    });

    it("should preserve a null description", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await storeService.create(SESSION_ID, {
        ...validCreateInput,
        description: null,
      });

      expect(storeCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        }),
      );
    });

    it("should reject a nonexistent session", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(undefined);

      await expect(
        storeService.create(SESSION_ID, validCreateInput),
      ).rejects.toMatchObject({
        code: "SESSION_NOT_FOUND",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an expired session", async () => {
      prepareAuthenticatedSession({
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(
        storeService.create(SESSION_ID, validCreateInput),
      ).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an anonymous session", async () => {
      prepareAuthenticatedSession({
        user_id: null,
      });

      await expect(
        storeService.create(SESSION_ID, validCreateInput),
      ).rejects.toMatchObject({
        code: "STORE_FORBIDDEN",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject creation when the owner already has a store", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(createStore());

      await expect(
        storeService.create(SESSION_ID, {
          ...validCreateInput,
          name: "Deuxième Boutique",
        }),
      ).rejects.toMatchObject({
        code: "STORE_ALREADY_EXISTS",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();

      expect(storeCreateSpy).not.toHaveBeenCalled();
    });

    it("should reject an empty store name", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await expect(
        storeService.create(SESSION_ID, {
          ...validCreateInput,
          name: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STORE",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject a store name longer than 100 characters", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await expect(
        storeService.create(SESSION_ID, {
          ...validCreateInput,
          name: "A".repeat(101),
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STORE",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an invalid country", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await expect(
        storeService.create(SESSION_ID, {
          ...validCreateInput,
          country: "TGO",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STORE",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an empty city", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await expect(
        storeService.create(SESSION_ID, {
          ...validCreateInput,
          city: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STORE",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject a city longer than 100 characters", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await expect(
        storeService.create(SESSION_ID, {
          ...validCreateInput,
          city: "A".repeat(101),
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STORE",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should create the store.created event inside the transaction", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      const createdStore = createStore();

      storeCreateSpy.mockResolvedValue(createdStore);

      await storeService.create(SESSION_ID, validCreateInput);

      expect(eventCreateSpy).toHaveBeenCalledWith({
        event_name: "store.created",
        session_id: SESSION_ID,
        user_id: USER_ID,
        store_id: STORE_ID,
        metadata: {},
      });
    });
  });

  // ---------------------------------------------------------------------------
  // GET BY ID
  // ---------------------------------------------------------------------------

  describe("getById", () => {
    it("should return the store", async () => {
      const store = createStore();

      mocks.storeRepository.findById.mockResolvedValue(store);

      const result = await storeService.getById(STORE_ID);

      expect(result).toEqual(store);

      expect(mocks.storeRepository.findById).toHaveBeenCalledWith(
        STORE_ID,
      );
    });

    it("should reject a nonexistent store", async () => {
      mocks.storeRepository.findById.mockResolvedValue(undefined);

      await expect(
        storeService.getById(STORE_ID),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // GET BY OWNER ID
  // ---------------------------------------------------------------------------

  describe("getByOwnerId", () => {
    it("should return the owner's store", async () => {
      const store = createStore();

      mocks.storeRepository.findByOwnerId.mockResolvedValue(store);

      const result = await storeService.getByOwnerId(USER_ID);

      expect(result).toEqual(store);

      expect(mocks.storeRepository.findByOwnerId).toHaveBeenCalledWith(
        USER_ID,
      );
    });

    it("should return null when the owner has no store", async () => {
      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      const result = await storeService.getByOwnerId(USER_ID);

      expect(result).toBeNull();

      expect(mocks.storeRepository.findByOwnerId).toHaveBeenCalledWith(
        USER_ID,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  describe("update", () => {
    it("should update an owned store", async () => {
      prepareAuthenticatedSession();

      const store = createStore();

      const updatedStore = createStore({
        name: "Ma Nouvelle Boutique",
        description: "Nouvelle description",
        country: "BJ",
        city: "Cotonou",
      });

      mocks.storeRepository.findById.mockResolvedValue(store);

      storeUpdateSpy.mockResolvedValue(updatedStore);

      const result = await storeService.update(
        SESSION_ID,
        STORE_ID,
        validUpdateInput,
      );

      expect(result).toEqual(updatedStore);

      expect(mocks.storeRepository.findById).toHaveBeenCalledWith(
        STORE_ID,
      );

      expect(storeUpdateSpy).toHaveBeenCalledWith(STORE_ID, {
        name: "Ma Nouvelle Boutique",
        description: "Nouvelle description",
        country: "BJ",
        city: "Cotonou",
      });
    });

    it("should update only the provided fields", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      await storeService.update(SESSION_ID, STORE_ID, {
        name: "Boutique Modifiée",
      });

      expect(storeUpdateSpy).toHaveBeenCalledWith(STORE_ID, {
        name: "Boutique Modifiée",
      });
    });

    it("should normalize the name during update", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      await storeService.update(SESSION_ID, STORE_ID, {
        name: "  Boutique Modifiée  ",
      });

      expect(storeUpdateSpy).toHaveBeenCalledWith(STORE_ID, {
        name: "Boutique Modifiée",
      });
    });

    it("should normalize the country during update", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      await storeService.update(SESSION_ID, STORE_ID, {
        country: " bj ",
      });

      expect(storeUpdateSpy).toHaveBeenCalledWith(STORE_ID, {
        country: "BJ",
      });
    });

    it("should normalize the city during update", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      await storeService.update(SESSION_ID, STORE_ID, {
        city: "  Cotonou  ",
      });

      expect(storeUpdateSpy).toHaveBeenCalledWith(STORE_ID, {
        city: "Cotonou",
      });
    });

    it("should preserve a null description during update", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      await storeService.update(SESSION_ID, STORE_ID, {
        description: null,
      });

      expect(storeUpdateSpy).toHaveBeenCalledWith(STORE_ID, {
        description: null,
      });
    });

    it("should reject a nonexistent session", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(undefined);

      await expect(
        storeService.update(
          SESSION_ID,
          STORE_ID,
          validUpdateInput,
        ),
      ).rejects.toMatchObject({
        code: "SESSION_NOT_FOUND",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an expired session", async () => {
      prepareAuthenticatedSession({
        expires_at: new Date(Date.now() - 1000),
      });

      await expect(
        storeService.update(
          SESSION_ID,
          STORE_ID,
          validUpdateInput,
        ),
      ).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an anonymous session", async () => {
      prepareAuthenticatedSession({
        user_id: null,
      });

      await expect(
        storeService.update(
          SESSION_ID,
          STORE_ID,
          validUpdateInput,
        ),
      ).rejects.toMatchObject({
        code: "STORE_FORBIDDEN",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject a nonexistent store", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(undefined);

      await expect(
        storeService.update(
          SESSION_ID,
          STORE_ID,
          validUpdateInput,
        ),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an update from a non-owner", async () => {
      prepareAuthenticatedSession({
        user_id: USER_ID,
      });

      mocks.storeRepository.findById.mockResolvedValue(
        createStore({
          owner_id: OTHER_USER_ID,
        }),
      );

      await expect(
        storeService.update(
          SESSION_ID,
          STORE_ID,
          validUpdateInput,
        ),
      ).rejects.toMatchObject({
        code: "STORE_FORBIDDEN",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an invalid name during update", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      await expect(
        storeService.update(SESSION_ID, STORE_ID, {
          name: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STORE",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an invalid country during update", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      await expect(
        storeService.update(SESSION_ID, STORE_ID, {
          country: "TGO",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STORE",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject an invalid city during update", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      await expect(
        storeService.update(SESSION_ID, STORE_ID, {
          city: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STORE",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject when the repository cannot update the store", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      storeUpdateSpy.mockResolvedValue(undefined);

      await expect(
        storeService.update(
          SESSION_ID,
          STORE_ID,
          validUpdateInput,
        ),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });
    });

    it("should create the store.updated event", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(createStore());

      const updatedStore = createStore({
        name: "Boutique Modifiée",
      });

      storeUpdateSpy.mockResolvedValue(updatedStore);

      await storeService.update(SESSION_ID, STORE_ID, {
        name: "Boutique Modifiée",
      });

      expect(eventCreateSpy).toHaveBeenCalledWith({
        event_name: "store.updated",
        session_id: SESSION_ID,
        user_id: USER_ID,
        store_id: STORE_ID,
        metadata: {},
      });
    });
  });

  // ---------------------------------------------------------------------------
  // ACTIVATE
  // ---------------------------------------------------------------------------

  describe("activate", () => {
    it("should activate an owned inactive store", async () => {
      prepareAuthenticatedSession();

      const store = createStore({
        status: "inactive",
      });

      const activatedStore = createStore({
        status: "active",
      });

      mocks.storeRepository.findById.mockResolvedValue(store);

      storeSetStatusSpy.mockResolvedValue(activatedStore);

      const result = await storeService.activate(
        SESSION_ID,
        STORE_ID,
      );

      expect(result).toEqual(activatedStore);

      expect(storeSetStatusSpy).toHaveBeenCalledWith(
        STORE_ID,
        "active",
      );
    });

    it("should reject activating an already active store", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(
        createStore({
          status: "active",
        }),
      );

      await expect(
        storeService.activate(SESSION_ID, STORE_ID),
      ).rejects.toMatchObject({
        code: "INVALID_STORE_STATUS_TRANSITION",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();

      expect(storeSetStatusSpy).not.toHaveBeenCalled();
    });

    it("should reject activating a nonexistent store", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(undefined);

      await expect(
        storeService.activate(SESSION_ID, STORE_ID),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject activation by a non-owner", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(
        createStore({
          owner_id: OTHER_USER_ID,
          status: "inactive",
        }),
      );

      await expect(
        storeService.activate(SESSION_ID, STORE_ID),
      ).rejects.toMatchObject({
        code: "STORE_FORBIDDEN",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject when the repository cannot activate the store", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(
        createStore({
          status: "inactive",
        }),
      );

      storeSetStatusSpy.mockResolvedValue(undefined);

      await expect(
        storeService.activate(SESSION_ID, STORE_ID),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });
    });

    it("should create the store.activated event", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(
        createStore({
          status: "inactive",
        }),
      );

      storeSetStatusSpy.mockResolvedValue(
        createStore({
          status: "active",
        }),
      );

      await storeService.activate(SESSION_ID, STORE_ID);

      expect(eventCreateSpy).toHaveBeenCalledWith({
        event_name: "store.activated",
        session_id: SESSION_ID,
        user_id: USER_ID,
        store_id: STORE_ID,
        metadata: {},
      });
    });
  });

  // ---------------------------------------------------------------------------
  // DEACTIVATE
  // ---------------------------------------------------------------------------

  describe("deactivate", () => {
    it("should deactivate an owned active store", async () => {
      prepareAuthenticatedSession();

      const store = createStore({
        status: "active",
      });

      const deactivatedStore = createStore({
        status: "inactive",
      });

      mocks.storeRepository.findById.mockResolvedValue(store);

      storeSetStatusSpy.mockResolvedValue(deactivatedStore);

      const result = await storeService.deactivate(
        SESSION_ID,
        STORE_ID,
      );

      expect(result).toEqual(deactivatedStore);

      expect(storeSetStatusSpy).toHaveBeenCalledWith(
        STORE_ID,
        "inactive",
      );
    });

    it("should reject deactivating an already inactive store", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(
        createStore({
          status: "inactive",
        }),
      );

      await expect(
        storeService.deactivate(SESSION_ID, STORE_ID),
      ).rejects.toMatchObject({
        code: "INVALID_STORE_STATUS_TRANSITION",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();

      expect(storeSetStatusSpy).not.toHaveBeenCalled();
    });

    it("should reject deactivating a nonexistent store", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(undefined);

      await expect(
        storeService.deactivate(SESSION_ID, STORE_ID),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject deactivation by a non-owner", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(
        createStore({
          owner_id: OTHER_USER_ID,
          status: "active",
        }),
      );

      await expect(
        storeService.deactivate(SESSION_ID, STORE_ID),
      ).rejects.toMatchObject({
        code: "STORE_FORBIDDEN",
      });

      expect(mockDatabase.transaction).not.toHaveBeenCalled();
    });

    it("should reject when the repository cannot deactivate the store", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(
        createStore({
          status: "active",
        }),
      );

      storeSetStatusSpy.mockResolvedValue(undefined);

      await expect(
        storeService.deactivate(SESSION_ID, STORE_ID),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });
    });

    it("should create the store.deactivated event", async () => {
      prepareAuthenticatedSession();

      mocks.storeRepository.findById.mockResolvedValue(
        createStore({
          status: "active",
        }),
      );

      storeSetStatusSpy.mockResolvedValue(
        createStore({
          status: "inactive",
        }),
      );

      await storeService.deactivate(SESSION_ID, STORE_ID);

      expect(eventCreateSpy).toHaveBeenCalledWith({
        event_name: "store.deactivated",
        session_id: SESSION_ID,
        user_id: USER_ID,
        store_id: STORE_ID,
        metadata: {},
      });
    });
  });
});

