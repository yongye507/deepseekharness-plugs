# deepseekharness-plugs

个人平台([personal-platform](https://github.com/yongye507/deepseekharness-plugs) 对应平台的 `features/` 扩展集合)。

每个子目录是一个独立插件,按平台 features 约定开发,通过 `install.sh` 安装到平台。

## 插件列表

| 插件 | 说明 | 状态 |
|---|---|---|
| `yuketang` | 雨课堂:扫码登录、课程列表、学习数据 | 开发中 |

## 安装

```bash
./install.sh <平台目录>        # 例如 ./install.sh ../personal-platform
```

安装会:复制插件到平台的 `features/`、注册到平台数据库、安装所需依赖。
