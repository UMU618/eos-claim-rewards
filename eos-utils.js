#!/usr/bin/env node

/**
 * @author UMU618 <umu618@hotmail.com>
 * @copyright MEET.ONE 2019
 * @description Use npm-coding-style.
 */

'use strict'

const MS_PER_HOUR = 1000 * 60 * 60
const MS_PER_DAY = MS_PER_HOUR * 24

module.exports = {
  Claimer: function (chainId, url, chainName
    , producerName, permission, keyProvider
    , dingtalkToken) {
    if (!chainId) {
      throw new Error('no chainId')
    }
    if (!url) {
      throw new Error('no url')
    }
    if (!chainName) {
      throw new Error('no chainName')
    }
    if (!producerName) {
      throw new Error('no producerName')
    }
    if (!permission) {
      throw new Error('no permission')
    }
    if (!keyProvider) {
      throw new Error('no keyProvider')
    }
    if (!dingtalkToken) {
      console.log('Warning: no dingtalkToken, will not send messages.')
    }

    const { Api, JsonRpc } = require('eosjs')
    const fetch = require('node-fetch')

    this.chainId = chainId
    this.chainName = chainName
    this.producerName = producerName
    this.permission = permission
    this.keyProvider = keyProvider
    this.dingtalkToken = dingtalkToken

    this.rpc = new JsonRpc(url, { fetch })

    this.detectLastClaimTime = () => {
      let self = this

      this.rpc
        .get_table_rows({
          'json': true
          , 'code': 'eosio'
          , 'scope': 'eosio'
          , 'table': 'producers'
          , 'lower_bound': this.producerName
          , 'limit': 1
        })
        .then(function (result) {
          let eosUTCTimeString = result.rows[0].last_claim_time + 'Z'
          let lastClaimTime = new Date(eosUTCTimeString)
          let now = new Date()
          let nextClaimDiff
          if (now - lastClaimTime >= MS_PER_DAY) {
            // Check 10s later to ensure success
            nextClaimDiff = 10 * 1000
            console.log('Last claim rewards from ' + self.chainName + ' on '
              + lastClaimTime.toJSON() + ', claiming on ' + now + '.')
            self.claimRewards();
          } else {
            nextClaimDiff = MS_PER_DAY - (now - lastClaimTime)
            console.log('Last claim rewards from ' + self.chainName + ' on '
              + lastClaimTime.toJSON() + ', can not claim right now.')
          }
          console.log('Will claim after ' + nextClaimDiff + 'ms.')

          setTimeout(function () {
            self.detectLastClaimTime();
          }, nextClaimDiff)
        }, function (err) {
          setTimeout(function () {
            self.detectLastClaimTime();
          }, 10 * 1000)
        })
    }

    this.claimRewards = () => {
      let self = this
      const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
      // Built-in from v11.0.0
      //const { TextEncoder, TextDecoder } = require('util')
      const sig = new JsSignatureProvider([this.keyProvider])
      const api = new Api({
        rpc: this.rpc, signatureProvider: sig, chainId: this.chainId
        , textDecoder: new TextDecoder(), textEncoder: new TextEncoder()
      });
      api
        .transact({
          actions: [{
            account: 'eosio'
            , name: 'claimrewards'
            , authorization: [{
              actor: this.producerName
              , permission: this.permission
            }]
            , data: {
              owner: this.producerName
            }
          }]
        }, {
            broadcast: true,
            blocksBehind: 3,
            expireSeconds: 60,
            sign: true
          })
        .then(function () {
          // get account balance after claim reward.
          let date = new Date()
          self.rpc
            .get_currency_balance('eosio.token', self.producerName)
            .then((res) => {
              module.exports.sendMessage(self.dingtalkToken, date.toJSON()
                + ', ' + require('os').hostname() + ' claimed rewards on '
                + self.chainName + ', ' + self.producerName + ' : ' + res[0]
                + '.')
            })
        }, (err) => {
          console.log('claim rewards failed on ' + self.chainName + '.')
          console.error(err)
        })
    }
  }

  , sendMessage: (token, text) => {
    if (!token || !text) {
      console.log('Message: ' + text)
      return
    }
    const fetch = require('node-fetch')

    fetch('https://oapi.dingtalk.com/robot/send?access_token=' + token, {
      method: 'POST'
      , headers: {
        'Content-Type': 'application/json'
      }
      , body: JSON.stringify({
        "msgtype": "text"
        , "text": {
          "content": text
        }
      })
    }).then((res) => {
      if (res.ok) {
        console.log('Message sent: ' + text)
      } else {
        console.log('status = ' + res.status)
      }
    }, (err) => {
      console.log(err)
    })
  }
}
