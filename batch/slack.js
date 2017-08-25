const { WebClient } = require('@slack/client');

const promisedPostMessage = (...messages) => {
  const slack = new WebClient(process.env.SLACK_API_TOKEN);
  return new Promise((resolve, reject) => (
    slack.chat.postMessage(process.env.SLACK_ROOMID, '', {
      attachments: messages,
    }, (err, res) => {
      if (err) {
        console.log('Error: ', err);
        reject(err);
      } else {
        console.log('Message sent: ', res);
        resolve(res);
      }
    })
  ));
};
module.postMessage = promisedPostMessage;

const buildMessage = ({ title, text, time }) => ({
  fallback: `${title}: ${text}`,
  title,
  text,
  color: 'good',
  ts: time || (Date.now() / 1000),
});
module.buildMessage = buildMessage;

const buildErrorMessage = (error) => ({
  fallback: `${error.name}: ${error.message}`,
  title: error.name,
  text: error.message,
  color: 'danger',
});
module.buildErrorMessage = buildErrorMessage;

module.exports = {
  postMessage: promisedPostMessage,
  buildMessage,
  buildErrorMessage,
};
