const defaultProvider = {
  after: (delayMs) => new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  }),
};

let activeProvider = defaultProvider;

export class Scheduler {
  static current() {
    return activeProvider;
  }

  static configure(provider) {
    if (provider && typeof provider.after === 'function') {
      activeProvider = provider;
    }
  }

  static reset() {
    activeProvider = defaultProvider;
  }
}
