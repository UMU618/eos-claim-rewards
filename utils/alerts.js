/**
 * @author UMU618 <umu618@hotmail.com>
 * @copyright MEET.ONE 2019
 * @description Use block-always-using-brace npm-coding-style.
 */

'use strict'

const fetch = require('node-fetch')

module.exports = {
  getDingtalkSign: (timestamp, secret) => {
    const to_sign = timestamp + '\n' + secret
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    return hmac.update(to_sign).digest('base64')
  }

  , sendDingtalk: (token, secret, text) => {
    if (!token || !text) {
      console.log('Message:', text)
      return
    }

    let url = 'https://oapi.dingtalk.com/robot/send?access_token=' + token
    if (secret) {
      const timestamp = Date.now()
      url += '&timestamp=' + timestamp + '&sign='
        + encodeURIComponent(module.exports.getDingtalkSign(timestamp, secret))
    }
    fetch(url, {
      method: 'POST'
      , headers: {
        'Content-Type': 'application/json'
      }
      , body: JSON.stringify({
        msgtype: 'text'
        , text: {
          content: text
        }
      })
    }).then((res) => {
      if (res.ok) {
        return res.json()
      } else {
        console.error('status =', res.status)
      }
    }, (err) => {
      console.log(err)
    }).then((jo) => {
      if (jo.errcode === 0) {
        console.log('Message sent:', text)
      } else {
        console.error('fail to send dingtalk, response =', jo)
      }
    })
  }

  , sendTelegram: (token, chat_id, text) => {
    fetch('https://api.telegram.org/bot' + token + '/sendMessage?'
      + require('querystring').stringify({
        chat_id: chat_id, text: text
      }), { method: 'POST' })
      .then(function (res) {
        if (res.ok) {
          console.log('Telegram message sent!')
        } else {
          console.error('status = ' + res.status)
        }
      }, function (e) {
        console.log(e)
      })
  }

  , sendFeishu: (token, text, title) => {
    if (!token || !text) {
      console.log('Message:', text)
      return
    }
    const url = 'https://open.feishu.cn/open-apis/bot/hook/' + token
    const jo = {
      text: text
    }
    if (title) {
      jo.title = title
    }
    fetch(url, {
      method: 'POST'
      , headers: {
        'Content-Type': 'application/json'
      }
      , body: JSON.stringify(jo)
    }).then((res) => {
      if (res.ok) {
        return res.json()
      } else {
        console.error('status =', res.status)
      }
    }, (err) => {
      console.log(err)
    }).then((jo) => {
      if (jo.ok === true) {
        console.log('Message sent:', text)
      } else {
        console.error('fail to send feishu, response =', jo)
      }
    })
  }
}
