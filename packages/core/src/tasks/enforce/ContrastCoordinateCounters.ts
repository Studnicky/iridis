interface ContrastCoordinateUsageInterface {
  readonly 'candidateCount': number;
  readonly 'candidateScoreCalls': number;
  readonly 'optimizerPasses': number;
  readonly 'repairPasses': number;
}

class ContrastCoordinateCounters {
  #candidateCount = 0;
  #candidateScoreCalls = 0;
  #enabled = false;
  #optimizerPasses = 0;
  #repairPasses = 0;

  begin(): void {
    this.#candidateCount = 0;
    this.#candidateScoreCalls = 0;
    this.#enabled = true;
    this.#optimizerPasses = 0;
    this.#repairPasses = 0;
  }

  end(): ContrastCoordinateUsageInterface {
    const result = this.usage();
    this.#enabled = false;
    return result;
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  recordCandidate(): void {
    if (this.#enabled) {
      this.#candidateCount += 1;
    }
  }

  recordCandidateScore(): void {
    if (this.#enabled) {
      this.#candidateScoreCalls += 1;
    }
  }

  recordOptimizerPass(): void {
    if (this.#enabled) {
      this.#optimizerPasses += 1;
    }
  }

  recordRepairPass(): void {
    if (this.#enabled) {
      this.#repairPasses += 1;
    }
  }

  usage(): ContrastCoordinateUsageInterface {
    const result: ContrastCoordinateUsageInterface = {
      'candidateCount': this.#candidateCount,
      'candidateScoreCalls': this.#candidateScoreCalls,
      'optimizerPasses': this.#optimizerPasses,
      'repairPasses': this.#repairPasses
    };
    return result;
  }
}

/** Test-only deterministic counters for the joint contrast optimizer. */
export const contrastCoordinateCounters = new ContrastCoordinateCounters();
