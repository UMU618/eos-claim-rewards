#!/usr/bin/env node

/**
 * @author UMU618 <umu618@hotmail.com>
 * @copyright MEET.ONE 2019
 * @description Use npm-coding-style.
 */

'use strict'

const alerts = require('./utils/alerts')

const MS_PER_HOUR = 1000 * 60 * 60
const MS_PER_DAY = MS_PER_HOUR * 24

module.exports = {
  Claimer: function (chainId, url, chainName
    , producerName, permission, keyProvider
    , token) {
    if (!chainId) {
      throw new Error('no chainId')
    }
    if (!url) {
      throw new Error('no url')
    }
    if (!chainName) {
      throw new Error('no chainName')
    }
    if (!module.exports.isValidEosName(producerName)) {
      throw new Error('invalid producerName')
    }
    if (!permission) {
      throw new Error('no permission')
    }
    if (!keyProvider) {
      throw new Error('no keyProvider')
    }
    if (!token) {
      console.log('Warning: no token, will not send messages.')
    }

    const { Api, JsonRpc } = require('eosjs')
    const fetch = require('node-fetch')

    this.chainId = chainId
    this.chainName = chainName
    this.producerName = producerName
    this.permission = permission
    this.keyProvider = keyProvider
    this.token = token

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
            console.log(self.producerName + ' last claimed rewards from '
              + self.chainName + ' on ' + lastClaimTime.toJSON()
              + ', claiming on ' + now + ', and will check after '
              + nextClaimDiff + 'ms.')
            self.claimRewards()
          } else {
            nextClaimDiff = MS_PER_DAY - (now - lastClaimTime)
            console.log(self.producerName + ' last claimed rewards from '
              + self.chainName + ' on ' + lastClaimTime.toJSON()
              + ', will claim after ' + nextClaimDiff + 'ms.')
          }

          setTimeout(function () {
            self.detectLastClaimTime()
          }, nextClaimDiff)
        }, function (err) {
          setTimeout(function () {
            self.detectLastClaimTime()
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
      })
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
        .then(function (r) {
          // get account balance after claim reward.
          let date = new Date()
          self.rpc
            .get_currency_balance('eosio.token', self.producerName)
            .then((res) => {
              alerts.sendFeishu(self.token, date.toJSON()
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

  , isValidEosName: (name) => {
    if (typeof name !== 'string' || !name) {
      return false
    }
    if (name.length > 13) {
      return false
    }
    const charmap = '.12345abcdefghijklmnopqrstuvwxyz'
    let length = name.length
    if (length == 13) {
      const idx = charmap.indexOf(name[--length])
      if (idx === -1 || idx > 15) {
        return false
      }
    }
    for (let i = 0; i < length; ++i) {
      const idx = charmap.indexOf(name[i])
      if (idx === -1) {
        return false
      }
    }
    return true
  }
}
