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

const buildMessage = ({ title, text, time, color = 'good', pretext = '' }) => ({
  fallback: `${title}: ${text}`,
  pretext,
  title,
  text,
  color,
  ts: time || (Date.now() / 1000),
});
module.buildMessage = buildMessage;

const buildErrorMessage = (error, pretext = '') => ({
  fallback: `${error.name}: ${error.message}`,
  pretext,
  title: error.name,
  text: error.message,
  color: 'danger',
  ts: Date.now() / 1000,
});
module.buildErrorMessage = buildErrorMessage;

module.exports = {
  postMessage: promisedPostMessage,
  buildMessage,
  buildErrorMessage,
};
