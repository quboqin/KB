# The Logic of Compliant Lending and Credit Architecture

> 原始文件：The Logic of Compliant Lending and Credit Arch.html

为了更直观地说明“融担”、“助贷”和“征信”在合规架构下的协作关系，我为你绘制了三张核心逻辑图。这些图表展示了资金、数据和风险在不同模式下的流转差异。

### 图解一：合规基石——“断直连”后的数据流向图

这是所有助贷业务必须遵循的底层数据架构。根据《征信业务管理办法》，平台不得直接向金融机构提供个人信用画像，必须通过持牌征信机构（如百行、朴道）进行“清洗”和“传输” 。

```mermaid
graph LR

User(借款用户) --1. 授权--> Platform(助贷平台/App)

Platform --2. 原始数据(非画像)--> Credit(持牌征信机构)

Credit --3. 数据清洗与评分--> Bank(银行/资金方)

Bank --4. 授信决策--> User

style Credit fill:#f9f,stroke:#333,stroke-width:2px

style Platform fill:#ddd,stroke:#333

style Bank fill:#bbf,stroke:#333
```

- **核心变化**：征信机构成为了数据流动的“总阀门”和合法性管道，平台失去了对风控数据的直接控制权。

---

### 图解二：融担模式（担保增信）—— 风险兜底结构

这是目前中小银行最主流的合作模式。核心在于引入融资担保公司来锁定义务。2025年的新规要求，所有费用（含担保费）加总不得超过年化24% 。

```mermaid
sequenceDiagram

participant User as 借款人

participant Platform as 助贷平台

participant Guarantee as 融资担保公司

participant Bank as 银行(资金方)

User->>Platform: 申请借款

Platform->>Guarantee: 推送资产(初筛)

Guarantee->>Bank: 出具担保函(兜底承诺)

Bank->>User: 发放贷款

Note over User, Bank: 还款流程

User->>Bank: 偿还本金 + 利息(约7%-10%)

User->>Guarantee: 支付担保费(约2%-4%)

User->>Platform: 支付科技服务费

Note over User, Bank: 违约流程

User--xBank: 逾期未还

Bank->>Guarantee: 发起代偿申请

Guarantee->>Bank: 赔付本息

Guarantee->>User: 追偿债权
```

- 

**角色关键点**：

- 

**融担公司**：是风险的“吸纳者”。如果坏账率爆表，融担公司最先倒闭。

- 

**银行**：是“旱涝保收”的资金提供方，赚取固定收益 。

---

### 图解三：分润模式（轻资产）—— 风险共担/银行自营结构

这是监管鼓励的未来方向。平台不提供兜底，银行必须具备“自主风控”能力。

```mermaid
graph TD

subgraph 资金与风险闭环

Bank(银行/消金公司) --全额资金--> User(借款人)

User --本息还款--> Bank

User --逾期违约--> Bank

end

subgraph 助贷服务

Platform(助贷平台) --导流/辅助运营--> Bank

Bank --分润/技术服务费--> Platform

end

note[注意: 此时银行承担核心信用风险

平台仅收取服务佣金，不承担坏账]

style Bank fill:#f96,stroke:#333

style note fill:#ff9,stroke:#333
```

- 

**角色关键点**：

- 

**平台**：回归纯粹的“技术服务商”角色，不需重资产的担保牌照，但对获客质量要求极高。

- 

**银行**：必须自己拥有核心风控模型，能够独立判断用户好坏，盈亏自负 。

### 总结：2025年的关键变化

在2025年，这三张图的关系更加紧密且紧张：

- 

**费率天花板**：在融担模式中，`银行利息 + 担保费 + 平台服务费` 被强制锁定在 **24%** 以内 。由于银行资金成本刚性（约7%-10%）和坏账成本存在，**融担公司和平台的利润空间被极大压缩**。

- 

**双重合规**：既要满足**数据**上的“断直连”（图1），又要满足**资金**上的“利率封顶”（图2），导致大量尾部融担公司和劣质助贷平台正在退出市场 。