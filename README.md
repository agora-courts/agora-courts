# Agora Courts

![image](https://user-images.githubusercontent.com/54857388/224509430-2cad8da4-2621-4fb4-8ee0-a6a170ab6aeb.png)

Agora enables any protocol to create their own courts, where users can submit disputes, vote on cases, and earn rewards for doing so honestly, in an entirely decentralized manner. To learn more about Agora and how to integrate with your own protocol, read our [documentation](https://docs.agoracourts.com/).

## Project Overview
### Motivation
As Web3 grows, so will the amount of online P2P transactions between people from across the globe. With decentralized exchanges becoming the de facto hub for goods, labor, and capital, disputes between different parties are inevitable.

We are already seeing this trend in Web2:

eBay - 60 million marketplace disputes per year\
Alibaba - 5 million private volunteer jurors arbitrating platform transactions

But dApps don’t have a customer support team on standby ready to deal with every issue. Agora seeks to unlock new user-centric features for protocols in every corner of the ecosystem. We hope to transition the reliability of Web2 arbitration into Web3 to improve how users interact with decentralized applications.

## Primary Features
### Create Courts
Different platforms have different needs, so each protocol’s court is unique and highly customizable. Choose which users votes, when they vote, and how much each vote is weighted. Already using a native token? No problem. Easily integrate any token to be used on Agora disputes. 

### Settle Disputes
Never bound by geographic borders, settle disputes between anyone, anywhere, at anytime. Combine the finality of programmatic smart contracts with the flexibility of subjective decision-making and arbitration. Agora targets cases that traditional arbitration systems cannot, in an entirely decentralized manner.

### Incentivize Honesty
Game theory and cryptoeconomic incentivization is used to encourage unbiased voting. Coherent voters earn token rewards while bad actors are slashed. Our reputation system rewards voters who participate frequently and honestly, unlocking disputes with larger payouts as a user climbs the levels.

## Design
![image](https://user-images.githubusercontent.com/54857388/224514981-7da34d5f-f6bf-4c76-ac1e-fcdfd79d2785.png)

## Watch Agora In Action
[Agora Tokens](https://github.com/IlliniBlockchain/agora-tokens) is an open and decentralized curated registry of tokens. It is a community-managed list of Solana tokens open to any project and curated through the power of Agora arbitration and economic incentives.

Anyone can submit a token and its information along with a deposit. The submission is then placed in a challenge period. If no one challenges it, it is automatically placed in the token list. Otherwise, an Agora court jury will vote to determine whether to include or reject the listing. Further attributes called badges can be added to a token, and their acceptances follow the similar process.

## Testing Instructions
Run the following commands from the terminal. Tests may be modified to create different dispute parameters and users. The default configuration for tests is basic, with a 50 minute total dispute period - `close` may only be run after this period concludes.
```
1. anchor run initcourt
2. anchor run initdispute
3. anchor run interact
4. change config.ts user
5. anchor run interact
6. anchor run initcase
7. change config.ts user back
8. anchor run initcase
9. anchor run vote
10. anchor run close
11. anchor run claim on all users
```
