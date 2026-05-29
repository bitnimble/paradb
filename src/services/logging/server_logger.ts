import { Axiom } from '@axiomhq/js';
import { configure, getConsoleSink, getLogger, type Sink } from '@logtape/logtape';
import { getEnvVars } from '../env';
import { getSingleton } from '../singleton';

function configureLogger() {
  return getSingleton('_serverLogger', () => {
    const envVars = getEnvVars();

    const sinks: Record<string, Sink> = { console: getConsoleSink() };
    // Only ship to Axiom for real; tests (axiomImplementation=fake) log to the console sink only,
    // avoiding live network calls with placeholder credentials.
    if (envVars.axiomImplementation !== 'fake') {
      const axiom = new Axiom({ token: envVars.axiomApiToken });
      sinks.axiom = (record) => {
        axiom.ingest(envVars.axiomDataset, [
          {
            _time: record.timestamp,
            level: record.level,
            category: record.category.join('.'),
            message: record.message
              .map((m) => (typeof m === 'string' ? m : JSON.stringify(m)))
              .join(' '),
            properties: record.properties,
          },
        ]);
      };
    }

    const sinkNames = Object.keys(sinks);
    configure({
      sinks,
      filters: {},
      loggers: [
        { category: ['paradb'], lowestLevel: 'debug', sinks: sinkNames },
        { category: ['logtape', 'meta'], lowestLevel: 'warning', sinks: sinkNames },
      ],
    });

    return true;
  });
}

export function getLog(category: string[]) {
  configureLogger();
  return getLogger(['paradb', ...category]);
}
