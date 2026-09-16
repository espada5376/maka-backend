import { EventRepository, } from "../database/repositories/event.repository.js";
import { InsightEngineImpl, } from "./insight.engine.js";
import { InsightCalculator, } from "./insight.calculator.js";
import { InsightInterpreter, } from "./insight.interpreter.js";
export class InsightService {
    eventRepository;
    insightEngine;
    insightInterpreter;
    insightCalculator;
    constructor(eventRepository = new EventRepository(), insightEngine = new InsightEngineImpl(), insightInterpreter = new InsightInterpreter(), insightCalculator = new InsightCalculator()) {
        this.eventRepository = eventRepository;
        this.insightEngine = insightEngine;
        this.insightInterpreter = insightInterpreter;
        this.insightCalculator = insightCalculator;
    }
    async getStoreInsights(storeId) {
        const events = await this.eventRepository.findByStoreId(storeId);
        const metrics = this.insightCalculator.calculate(events);
        return this.insightInterpreter.interpretStore(metrics);
    }
    async getProductInsights(options) {
        const productInsight = await this.insightEngine.getProductMetrics(options);
        return this.insightInterpreter.interpretProduct(productInsight.metrics);
    }
}
