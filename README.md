# eos-claim-rewards

Claim rewards automatically, based on eosjs@20.0.0.

## Setup Permission

```
cleos set account permission producer_name claimer '{"threshold":1,"keys":[{"key":"public_key","weight":1}]}' "active" -p producer_name@active
cleos set action permission producer_name eosio claimrewards claimer
```

## Install

1. Install nodejs dependencies:

```
yarn install
```

2. Install PM2:

```
yarn global add pm2
`yarn global bin`/pm2 startup
```

Reference: <https://pm2.io/doc/zh/runtime/quick-start/>
