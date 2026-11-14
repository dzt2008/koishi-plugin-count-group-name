var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "count-group-name";
var inject = ["database"];
var Config = import_koishi.Schema.object({
  watchGroups: import_koishi.Schema.array(String).default([]).description("只监听指定群号（留空则监听所有群）"),
  maxRecords: import_koishi.Schema.number().default(50).description("每群最大保留历史记录条数")
});
function apply(ctx, config) {
  ctx.model.extend("group_name_history", {
    id: "unsigned",
    group_id: "string",
    group_name: "string",
    operator_id: { type: "string", nullable: true },
    // ✅ 官方文档支持的写法
    changed_at: "timestamp"
  }, {
    autoInc: true
  });
  ctx.on("internal/session", async (session) => {
    const raw = session.onebot;
    if (!raw) return;
    if (raw.post_type !== "notice") return;
    if (raw.notice_type !== "notify") return;
    if (raw.sub_type !== "group_name") return;
    const groupId = String(raw.group_id);
    const newName = raw.name_new;
    if (!groupId || !newName) return;
    if (config.watchGroups.length > 0 && !config.watchGroups.includes(groupId)) {
      return;
    }
    const operatorId = raw.operator_id ? String(raw.operator_id) : raw.user_id ? String(raw.user_id) : void 0;
    await ctx.database.create("group_name_history", {
      group_id: groupId,
      group_name: newName,
      operator_id: operatorId,
      changed_at: /* @__PURE__ */ new Date()
    });
    ctx.logger.info(`[count-group-name] 群 ${groupId} 名称变更记录: ${newName}`);
    const records = await ctx.database.select("group_name_history").where({ group_id: groupId }).orderBy("changed_at", "desc").execute();
    if (records.length > config.maxRecords) {
      const toDelete = records.slice(config.maxRecords);
      await ctx.database.remove("group_name_history", toDelete.map((r) => r.id));
    }
  });
  ctx.command("群名历史 [groupId:string]", "查询群名变更历史记录").alias("history-name", "groupnames").usage("在群聊中直接发送，或私聊时附带群号参数").action(async ({ session }, groupId) => {
    const targetGroupId = groupId || session?.channelId || session?.guildId;
    if (!targetGroupId) {
      return "❓ 请在群聊中使用，或指定群号参数。";
    }
    const records = await ctx.database.select("group_name_history").where({ group_id: String(targetGroupId) }).orderBy("changed_at", "desc").limit(20).execute();
    if (records.length === 0) {
      return "📭 该群暂无群名变更记录。";
    }
    const lines = records.map((r, idx) => {
      const time = new Date(r.changed_at).toLocaleString("zh-CN");
      const operator = r.operator_id ? ` 👤${r.operator_id}` : "";
      return `${idx + 1}. ${r.group_name}${operator}
   🕐 ${time}`;
    });
    return `📋 群 ${targetGroupId} 的历史群名（共 ${records.length} 条）：
━━━━━━━━━━━━━━
` + lines.join("\n");
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
