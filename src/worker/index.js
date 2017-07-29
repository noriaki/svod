import throng from 'throng';
import jackrabbit from 'jackrabbit';
import logger from 'logfmt';

throng({ workers: 1 }, () => {
  const shutdown = () => {
    logger.log({ type: 'info', msg: 'shutting down' });
    process.exit();
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  const onMessage = ({ service }, ack) => {
    logger.log({
      type: 'info', msg: 'on message', queue: 'jobs.crawl.list', service,
    });
    ack();
  };

  const exchange = jackrabbit(process.env.CLOUDAMQP_URL).default();
  exchange
    .queue({ name: 'jobs.crawl.list', durable: true })
    .consume(onMessage);

  logger.log({ type: 'info', msg: 'worker ready' });
});
