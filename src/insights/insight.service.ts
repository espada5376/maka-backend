
import {
  EventRepository,
} from "../database/repositories/event.repository.js";

import {
  Insight,
  InsightEngine,
  InsightEngineImpl,
  GetProductMetricsOptions,
} from "./insight.engine.js";

import {
  InsightCalculator,
} from "./insight.calculator.js";

import {
  InsightInterpreter,
} from "./insight.interpreter.js";

export class InsightService {
  constructor(
    private readonly eventRepository: EventRepository = new EventRepository(),
    private readonly insightEngine: InsightEngine = new InsightEngineImpl(),
    private readonly insightInterpreter: InsightInterpreter =
      new InsightInterpreter(),
    private readonly insightCalculator: InsightCalculator =
      new InsightCalculator(),
  ) {}

  async getStoreInsights(
    storeId: string,
  ): Promise<Insight[]> {
    const events = await this.eventRepository.findByStoreId(
      storeId,
    );

    const metrics = this.insightCalculator.calculate(events);

    return this.insightInterpreter.interpretStore(
      metrics,
    );
  }

  async getProductInsights(
    options: GetProductMetricsOptions,
  ): Promise<Insight[]> {
    const productInsight =
      await this.insightEngine.getProductMetrics(options);

    return this.insightInterpreter.interpretProduct(
      productInsight.metrics,
    );
  }
}

