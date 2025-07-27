# 保存和分享功能处理逻辑

## 保存功能流程图

```mermaid
flowchart TD
    A[用户点击保存按钮] --> B{当前是否有图表?}
    B -->|否| C[提示用户先创建图表]
    B -->|是| D[获取当前图表数据]
    D --> E[调用StorageService.saveChart]
    E --> F[保存到本地IndexedDB]
    F --> G[检查表结构]
    G --> H[ensureTableStructure]
    H --> I{NocoDB配置是否完整?}
    I -->|否| J[抛出配置错误]
    I -->|是| K[检查并创建必要字段]
    K --> L[同步到NocoDB]
    L --> M{同步成功?}
    M -->|是| N[保存完成]
    M -->|否| O[加入离线同步队列]
    O --> P[定时同步机制]
    P --> Q[每5分钟尝试同步]
    J --> R[显示错误信息]
    C --> S[结束]
    N --> S
    R --> S
```

## 分享功能流程图

```mermaid
flowchart TD
    A[用户点击分享按钮] --> B{当前图表是否存在且有ID?}
    B -->|否| C[提示"请先保存图表后再分享"]
    B -->|是| D[触发share-chart事件]
    D --> E[创建ShareModal实例]
    E --> F[显示分享模态框]
    F --> G[用户点击"生成并复制链接"]
    G --> H[按钮状态变为"生成中..."]
    H --> I[调用StorageService.getChart]
    I --> J{图表是否存在?}
    J -->|否| K[抛出"图表不存在"错误]
    J -->|是| L[将图表数据JSON序列化]
    L --> M[使用btoa进行Base64编码]
    M --> N[构建分享URL]
    N --> O["${origin}/share.html?data=${encodedData}"]
    O --> P[复制到剪贴板]
    P --> Q{复制成功?}
    Q -->|是| R[按钮显示"已复制"]
    Q -->|否| S[显示复制失败提示]
    R --> T[2秒后恢复按钮状态]
    K --> U[显示错误提示]
    S --> V[恢复按钮状态]
    C --> W[结束]
    T --> W
    U --> W
    V --> W
```

## 数据存储架构

```mermaid
flowchart LR
    A[前端应用] --> B[AppStore状态管理]
    B --> C[StorageService]
    C --> D[本地IndexedDB]
    C --> E[NocoDB云端存储]
    
    D --> F[charts表]
    D --> G[syncQueue表]
    
    E --> H[远程charts表]
    
    I[离线同步队列] --> J[定时同步机制]
    J --> K[每5分钟执行]
    K --> L[处理离线操作]
    L --> M[save/delete操作]
    
    subgraph "数据流向"
        N[用户操作] --> O[立即保存到本地]
        O --> P[尝试同步到云端]
        P --> Q{网络是否可用?}
        Q -->|是| R[直接同步]
        Q -->|否| S[加入离线队列]
    end
```

## 关键技术实现

### 保存功能关键点

1. **双重存储策略**
   - 本地IndexedDB：确保数据不丢失
   - NocoDB云端：实现跨设备同步

2. **离线支持**
   - 网络异常时自动加入同步队列
   - 定时重试机制（每5分钟）
   - 冲突解决策略（基于时间戳）

3. **表结构自动管理**
   - 动态检查和创建必要字段
   - 支持数据库结构演进

### 分享功能关键点

1. **数据编码策略**
   - JSON序列化 → Base64编码 → URL编码
   - 确保数据完整性和URL安全性

2. **分享链接格式**
   ```
   https://domain.com/share.html?data=<encoded_chart_data>
   ```

3. **安全性考虑**
   - 只读模式分享
   - 数据在URL中传输（适合小数据量）
   - 无需服务器端存储

## 错误处理机制

```mermaid
flowchart TD
    A[操作执行] --> B{是否发生错误?}
    B -->|否| C[操作成功]
    B -->|是| D[错误类型判断]
    D --> E[网络错误]
    D --> F[配置错误]
    D --> G[数据错误]
    D --> H[权限错误]
    
    E --> I[加入离线队列]
    F --> J[提示用户检查配置]
    G --> K[数据验证失败提示]
    H --> L[权限不足提示]
    
    I --> M[后续自动重试]
    J --> N[用户手动处理]
    K --> N
    L --> N
```

## 状态管理

```mermaid
stateDiagram-v2
    [*] --> Idle: 初始状态
    Idle --> Saving: 点击保存
    Saving --> Syncing: 本地保存完成
    Syncing --> Idle: 同步成功
    Syncing --> OfflineQueue: 同步失败
    OfflineQueue --> Syncing: 网络恢复
    
    Idle --> Sharing: 点击分享
    Sharing --> GeneratingLink: 生成链接中
    GeneratingLink --> Idle: 生成完成
    GeneratingLink --> Error: 生成失败
    Error --> Idle: 错误处理完成
```