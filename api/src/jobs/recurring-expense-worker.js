export function startRecurringExpenseWorker(store, intervalMs = 60_000) {
  let running = false;
  const processDue = async () => {
    if (running) return;
    running = true;
    try {
      const activated = await store.processDueRecurringExpenses();
      if (activated) console.info(`Activated ${activated} planned expense${activated === 1 ? '' : 's'}`);
    } catch (error) {
      console.error(`Could not process recurring expenses: ${error.message}`);
    } finally {
      running = false;
    }
  };
  void processDue();
  const timer = setInterval(processDue, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
