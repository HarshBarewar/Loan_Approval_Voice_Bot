/**
 * Scenario Test Runner
 * Executes scripted or live LLM test scenarios against the conversation engine.
 */

import { ConversationOrchestrator } from '../engine/conversation-orchestrator.js';
import { StateMachine } from '../engine/state-machine.js';
import { ScenarioDefinition, ScenarioResult, TranscriptMessage } from '../types.js';

export class ScenarioRunner {
  private orchestrator: ConversationOrchestrator;

  constructor(orchestrator: ConversationOrchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Run a single scenario definition
   */
  public async runScenario(
    scenario: ScenarioDefinition,
    useLiveLLM: boolean = false
  ): Promise<ScenarioResult> {
    const startTime = Date.now();
    let state = StateMachine.createInitialState(`test-${scenario.id}-${Date.now()}`);
    let transcript: TranscriptMessage[] = [];

    try {
      for (const turn of scenario.script) {
        // If state already reached terminal outcome, stop processing script
        if (state.finalOutcome !== null) {
          break;
        }

        const result = await this.orchestrator.processMessage(
          state,
          transcript,
          turn.text,
          !useLiveLLM // forceScripted if useLiveLLM is false
        );

        // Update state and transcript for next turn
        state = result.state || {
          ...state,
          stage: result.stage,
          checklist: result.checklist,
          overallEligibility: result.overallEligibility,
          finalOutcome: result.finalOutcome,
          routingReason: result.routingReason,
          disqualificationReason: result.disqualificationReason,
          nextMissingQuestion: result.nextMissingQuestion,
          turnCount: result.turnCount
        };
        transcript = result.transcript;
      }

      const assertions = scenario.expectedStateAssertions(state);
      const outcomeMatches = state.finalOutcome === scenario.expectedOutcome;
      const passed = outcomeMatches && assertions.pass;

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed,
        expectedOutcome: scenario.expectedOutcome,
        actualOutcome: state.finalOutcome,
        details: assertions.details,
        executionTimeMs: Date.now() - startTime,
        state,
        transcript,
        isLiveLLM: useLiveLLM
      };
    } catch (err: any) {
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed: false,
        expectedOutcome: scenario.expectedOutcome,
        actualOutcome: state.finalOutcome,
        details: `Error executing scenario: ${err.message}`,
        executionTimeMs: Date.now() - startTime,
        state,
        transcript,
        isLiveLLM: useLiveLLM
      };
    }
  }

  /**
   * Run all registered scenarios
   */
  public async runAll(scenarios: ScenarioDefinition[], useLiveLLM: boolean = false): Promise<ScenarioResult[]> {
    const results: ScenarioResult[] = [];
    for (const scenario of scenarios) {
      const res = await this.runScenario(scenario, useLiveLLM);
      results.push(res);
    }
    return results;
  }
}
