import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Globe, Router, Server, HardDrive, Monitor, Smartphone,
  Tv, Clock, Laptop, Box, Cpu, Camera, Plug, Wind,
  Wifi, Square, Thermometer, Volume2, Grid as GridIcon, ShieldCheck,
  Activity, Zap, Network, AlertTriangle, Link2, ExternalLink, Cable,
} from 'lucide-react';

// --- 自定义龙虾图标组件 ---
const LobsterIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <span
    className={`inline-flex items-center justify-center ${className}`}
    style={{ fontSize: size * 0.85, width: size, height: size, lineHeight: 1 }}
    role="img"
    aria-label="lobster"
  >
    🦞
  </span>
);

type IconType = React.ComponentType<{ size?: number | string; className?: string }>;

interface PortInfo {
  name: string;
  type: 'fiber' | 'wired' | 'virtual';
  status: 'up' | 'idle';
  note?: string;
}

interface DeviceBase {
  id: string;
  name: string;
  ip: string;
  ipType?: 'static' | 'dhcp' | 'dhcp-static';
  mac?: string;
  desc?: string;
  gateway?: string;
  warning?: boolean;
  badge?: string;
  icon: IconType;
  color?: string;
  bg?: string;
  glow?: boolean;
  config?: string[];
  physical?: string;
  ports?: PortInfo[];
  wireless?: string[];
  webUrl?: string;
}

// --- 基于 MD 文件的详细设备数据模型 (V2: 含端口/网关/IP类型/Web链接/无线频段/物理参数) ---
const devices = {
  core: [
    {
      id: 'modem', name: '电信光猫', ip: '192.168.1.1', ipType: 'static' as const,
      desc: '桥接模式 | 旁路由 NAT 映射', badge: '🔌 LAN 管理互通',
      icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10',
      config: ['桥接模式 (Bridge)', 'DHCP 已关闭', '自带WiFi可选关闭'],
      physical: '电信天翼网关 | 千兆光口',
      ports: [
        { name: 'WAN', type: 'fiber' as const, status: 'up' as const, note: '光纤入户' },
        { name: 'LAN1', type: 'wired' as const, status: 'up' as const, note: '→ 主路由 WAN' },
        { name: 'LAN2', type: 'wired' as const, status: 'up' as const, note: '→ 主路由 LAN (管理直通)' },
        { name: 'LAN3', type: 'wired' as const, status: 'idle' as const },
      ],
      webUrl: 'http://192.168.1.1',
    },
    {
      id: 'main-router', name: '小米主路由', ip: '192.168.123.6', ipType: 'static' as const,
      desc: 'PPPoE 拨号 | DHCP 关闭', icon: Router, color: 'text-indigo-400', bg: 'bg-indigo-500/10', glow: true,
      config: ['PPPoE 拨号 (公网出口)', 'DHCP 已关闭', 'SSH 端口映射: 外网→.77:22'],
      physical: '小米 AX 系列 | Wi-Fi 6 双频',
      gateway: 'PPPoE',
      ports: [
        { name: 'WAN', type: 'wired' as const, status: 'up' as const, note: '← 光猫 LAN1' },
        { name: 'LAN1', type: 'wired' as const, status: 'up' as const, note: '→ 旁路由' },
        { name: 'LAN2', type: 'wired' as const, status: 'up' as const, note: '← 光猫 LAN2 (管理)' },
        { name: 'LAN3', type: 'wired' as const, status: 'up' as const, note: '→ NAS / Mesh' },
      ],
      wireless: ['5G', '2.4G'],
      webUrl: 'http://192.168.123.6',
    },
    {
      id: 'bypass', name: '旁路由 (Passwall)', ip: '192.168.123.99', ipType: 'static' as const,
      mac: 'CE:9F:AD:**:**:**', desc: '网关 & DHCP 服务',
      icon: ShieldCheck, color: 'text-rose-400', bg: 'bg-rose-500/10',
      config: ['DHCP 服务器 (全局)', '默认网关角色', 'Passwall 科学上网', 'ACL 分流: IoT→直连'],
      physical: 'ImmortalWrt / OpenWrt',
      gateway: '.6',
      ports: [
        { name: 'ETH', type: 'wired' as const, status: 'up' as const, note: '← 主路由 LAN1' },
      ],
      webUrl: 'http://192.168.123.99',
    },
    {
      id: 'mesh', name: '小米 Mesh 节点', ip: '192.168.123.143', ipType: 'dhcp' as const,
      mac: '88:C3:97:**:**:**', desc: 'MiWiFi-RM1800',
      icon: Network, color: 'text-purple-400', bg: 'bg-purple-500/10',
      config: ['Mesh 无线回程', '透传模式'],
      physical: 'Redmi AX1800 | Wi-Fi 6',
      gateway: '.99',
      ports: [
        { name: 'LAN1', type: 'wired' as const, status: 'up' as const, note: '→ PVE 宿主机' },
      ],
      wireless: ['5G', '2.4G'],
      webUrl: 'http://192.168.123.143',
    },
  ] satisfies DeviceBase[],
  servers: [
    {
      id: 'nas', name: '绿联私有云 NAS', ip: '192.168.123.15', ipType: 'static' as const,
      mac: '98:6E:E8:**:**:**', gateway: '.6',
      icon: HardDrive, color: 'text-cyan-400', bg: 'bg-cyan-500/10',
      config: ['Docker Host 模式', 'HA / qBit / Alist'],
      physical: '绿联 DX4600+ | 4Bay NAS',
      ports: [
        { name: 'ETH', type: 'wired' as const, status: 'up' as const, note: '← 主路由 LAN' },
      ],
      webUrl: 'http://192.168.123.15',
    },
    {
      id: 'pve', name: 'PVE 虚拟机宿主机', ip: '192.168.123.66', ipType: 'static' as const,
      mac: 'A8:B8:E0:**:**:**', gateway: '.6',
      icon: Server, color: 'text-sky-400', bg: 'bg-sky-500/10',
      config: ['Proxmox VE 虚拟化', 'vmbr0 虚拟网桥', 'VM: OpenWrt + Ubuntu'],
      physical: 'x86 迷你主机 | 3×ETH',
      ports: [
        { name: 'ETH0', type: 'wired' as const, status: 'up' as const, note: '← Mesh LAN / 主路由' },
        { name: 'ETH1', type: 'wired' as const, status: 'idle' as const },
        { name: 'ETH2', type: 'wired' as const, status: 'idle' as const },
      ],
      webUrl: 'https://192.168.123.66:8006',
    },
    {
      id: 'ubuntu', name: 'OpenClaw Ubuntu', ip: '192.168.123.77', ipType: 'static' as const,
      mac: 'BC:24:11:**:**:**', gateway: '.99 (旁路由)', warning: true,
      badge: '🌐 外网 SSH 直连',
      icon: LobsterIcon, color: 'text-orange-400', bg: 'bg-orange-500/10',
      config: ['Ubuntu 22.04 LTS', '外网 SSH 端口映射', '流量走旁路由代理'],
      physical: 'PVE VM | 4C8G',
      ports: [
        { name: 'vETH', type: 'virtual' as const, status: 'up' as const, note: '→ vmbr0' },
      ],
    },
    {
      id: 'openwrt-vm', name: 'OpenWRT 虚拟机', ip: '192.168.123.9', ipType: 'static' as const,
      desc: '软路由系统', icon: Router, color: 'text-indigo-400', bg: 'bg-indigo-500/10',
      config: ['OpenWrt 软路由', 'vETH 接入 vmbr0'],
      physical: 'PVE VM | 2C2G',
      ports: [
        { name: 'vETH', type: 'virtual' as const, status: 'up' as const, note: '→ vmbr0' },
      ],
      webUrl: 'http://192.168.123.9',
    },
  ] satisfies DeviceBase[],
  wifi5g: [
    { id: 'dev-5g-appletv', name: 'Apple-TV-7', ip: '192.168.123.238', ipType: 'dhcp' as const, mac: 'C0:95:6D:**:**:**', icon: Tv, gateway: '.99' },
    { id: 'dev-5g-watch', name: 'Smart Watch', ip: '192.168.123.132', ipType: 'dhcp' as const, mac: '42:7F:77:**:**:**', icon: Clock, gateway: '.99' },
    { id: 'dev-5g-iphone', name: 'iPhone 16 Pro Max', ip: '192.168.123.162', ipType: 'dhcp' as const, mac: '58:66:6D:**:**:**', icon: Smartphone, gateway: '.99' },
    { id: 'dev-5g-macbook', name: 'MacBook Pro', ip: '192.168.123.115', ipType: 'dhcp' as const, mac: '02:D4:9E:**:**:**', icon: Laptop, gateway: '.99' },
    { id: 'dev-5g-pc', name: 'Desktop PC', ip: '192.168.123.167', ipType: 'dhcp' as const, mac: '38:18:68:**:**:**', icon: Monitor, gateway: '.99' },
    { id: 'dev-5g-other', name: '其他未知 5G 设备 x4', ip: 'DHCP 动态', ipType: 'dhcp' as const, mac: '8A:0B / 5C:C3...', icon: GridIcon, gateway: '.99' },
  ] satisfies DeviceBase[],
  hub: {
    id: 'dev-24g-hub', name: '小米中枢网关 Hub', ip: '192.168.123.172', ipType: 'dhcp-static' as const,
    mac: '94:F8:27:7F:7C:C8', icon: Cpu, color: 'text-amber-400',
    config: ['ZigBee 协调器', 'BLE Mesh 网关', 'DHCP Option 3→.6'],
    physical: 'xiaomi-gateway-hub1',
    gateway: '.6 (强制绑定)',
    wireless: ['2.4G', 'BLE', 'ZigBee'],
  } satisfies DeviceBase,
  bluetooth: [
    { id: 'dev-bt-curtain1', name: '杜亚窗帘电机 1', ip: '192.168.123.144', ipType: 'dhcp-static' as const, mac: 'C4:93:BB:10:EE:4A', icon: Square, gateway: '.6' },
    { id: 'dev-bt-curtain2', name: '杜亚窗帘电机 2', ip: '192.168.123.110', ipType: 'dhcp-static' as const, mac: 'C4:93:BB:10:EE:BE', icon: Square, gateway: '.6' },
    { id: 'dev-bt-plug1', name: '创米智能插座 1', ip: '192.168.123.129', ipType: 'dhcp-static' as const, mac: '58:B6:23:EC:B5:29', icon: Plug, gateway: '.6' },
    { id: 'dev-bt-plug2', name: '创米智能插座 2', ip: '192.168.123.130', ipType: 'dhcp-static' as const, mac: '58:B6:23:ED:28:F6', icon: Plug, gateway: '.6' },
  ] satisfies DeviceBase[],
  wifi24g: [
    { id: 'dev-24g-ac1', name: '小米空调 (c11)', ip: '192.168.123.104', ipType: 'dhcp-static' as const, mac: '7C:C2:94:31:1A:75', icon: Wind, gateway: '.6' },
    { id: 'dev-24g-ac2', name: '公牛空调伴侣 (cp6)', ip: '192.168.123.145', ipType: 'dhcp-static' as const, mac: '00:50:79:F1:86:35', icon: Wind, gateway: '.6' },
    { id: 'dev-24g-ac3', name: '绿米空调伴侣 (mcn02)', ip: '192.168.123.153', ipType: 'dhcp-static' as const, mac: '50:EC:50:7D:6B:91', icon: Wind, gateway: '.6' },
    { id: 'dev-24g-fridge', name: '米家冰箱 (midjd6)', ip: '192.168.123.188', ipType: 'dhcp' as const, mac: '3C:C5:DD:**:**:**', icon: Thermometer, gateway: '.99' },
    { id: 'dev-24g-camera', name: '创米摄像头', ip: '192.168.123.140', ipType: 'dhcp' as const, mac: '78:DF:72:AD:03:73', icon: Camera, gateway: '.99' },
    { id: 'dev-24g-speaker', name: '小爱同学 X08C', ip: '192.168.123.223', ipType: 'dhcp' as const, mac: 'D4:DA:21:41:19:04', icon: Volume2, gateway: '.99' },
  ] satisfies DeviceBase[],
};

// 连线配置
interface Connection {
  from: string;
  to: string;
  type: string;
  anchor: string;
  route?: string;
}

const connections: Connection[] = [
  { from: 'internet', to: 'modem', type: 'fiber', anchor: 'right-left' },
  { from: 'modem', to: 'main-router', type: 'fiber', anchor: 'right-left' },
  { from: 'modem', to: 'main-router', type: 'management', anchor: 'bottom-bottom', route: 'bridge-bottom' },
  { from: 'main-router', to: 'bypass', type: 'ethernet', anchor: 'top-bottom' },
  { from: 'main-router', to: 'group-24g', type: 'wifi-24g', anchor: 'right-left' },
  { from: 'dev-24g-hub', to: 'group-bluetooth', type: 'wifi-24g-faded', anchor: 'top-bottom' },
  { from: 'main-router', to: 'nas-container', type: 'ethernet', route: 'z-v', anchor: 'bottom-top' },
  { from: 'main-router', to: 'mesh', type: 'wifi-5g', anchor: 'bottom-top' },
  { from: 'main-router', to: 'group-5g', type: 'wifi-5g', route: 'z-v', anchor: 'bottom-top' },
  { from: 'mesh', to: 'pve-container', type: 'ethernet', anchor: 'bottom-top' },
  { from: 'openwrt-vm', to: 'veth-openwrt', type: 'virtual', anchor: 'right-left' },
  { from: 'ubuntu', to: 'veth-ubuntu', type: 'virtual', anchor: 'right-left' },
  { from: 'veth-openwrt', to: 'vmbr0-node', type: 'virtual', anchor: 'right-left' },
  { from: 'veth-ubuntu', to: 'vmbr0-node', type: 'virtual', anchor: 'right-left' },
  { from: 'vmbr0-node', to: 'pve-cpu-node', type: 'virtual', anchor: 'right-left' },
];

// --- Sub-components ---

const GlowingDot = () => (
  <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
  </span>
);

// --- IP 类型徽标 ---
const IpTypeBadge = ({ ipType }: { ipType?: string }) => {
  if (!ipType) return null;
  const styles: Record<string, { label: string; cls: string }> = {
    'static': { label: '静态', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    'dhcp': { label: 'DHCP', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    'dhcp-static': { label: 'DHCP 绑定', cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  };
  const s = styles[ipType] || styles['dhcp'];
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${s.cls}`}>{s.label}</span>;
};

// --- 网关徽标 ---
const GatewayBadge = ({ gateway, warning }: { gateway?: string; warning?: boolean }) => {
  if (!gateway) return null;
  const is99 = gateway.includes('.99');
  const is6 = gateway.includes('.6');
  const isPPPoE = gateway === 'PPPoE';
  const cls = warning
    ? 'bg-rose-950 text-rose-400 border-rose-900/50'
    : is99
      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
      : is6
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
        : isPPPoE
          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
          : 'bg-slate-700 text-slate-300 border-slate-600';
  return (
    <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${cls}`}>
      {warning && <AlertTriangle size={9} />}
      GW {gateway}
    </span>
  );
};

// --- 无线频段图标组 (右上角) ---
const WirelessIcons = ({ wireless }: { wireless?: string[] }) => {
  if (!wireless || wireless.length === 0) return null;
  const iconMap: Record<string, { label: string; cls: string }> = {
    '5G': { label: '5G', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    '2.4G': { label: '2.4G', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    'BLE': { label: 'BLE', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    'ZigBee': { label: 'ZB', cls: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  };
  return (
    <div className="absolute top-2.5 right-2.5 flex gap-1 z-20">
      {wireless.map(w => {
        const cfg = iconMap[w] || { label: w, cls: 'bg-slate-700 text-slate-300 border-slate-600' };
        return (
          <span key={w} className={`flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.cls}`}>
            <Wifi size={8} /> {cfg.label}
          </span>
        );
      })}
    </div>
  );
};

// --- 端口可视化 ---
const PortsRow = ({ ports }: { ports: PortInfo[] }) => {
  const typeIcon = (t: string) => {
    if (t === 'fiber') return <Globe size={9} className="text-yellow-400" />;
    if (t === 'wired') return <Cable size={9} className="text-blue-400" />;
    if (t === 'virtual') return <Network size={9} className="text-sky-400" />;
    return <Plug size={9} className="text-slate-400" />;
  };
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {ports.map((p, i) => (
        <div
          key={i}
          className={`flex items-center gap-1 text-[8px] font-mono px-1.5 py-0.5 rounded border ${
            p.status === 'up'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-500'
          }`}
          title={p.note || p.name}
        >
          {typeIcon(p.type)}
          <span className="font-bold">{p.name}</span>
          {p.status === 'up' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]"></span>}
        </div>
      ))}
    </div>
  );
};

const ProNodeCard = ({
  id, name, ip, ipType, mac, desc, gateway, warning, badge, icon: Icon,
  color, bg, glow, width = "w-64",
  config, physical, ports, wireless, webUrl,
}: DeviceBase & { width?: string }) => {
  const SafeIcon = Icon || Box;
  const badgeColor = badge?.includes('SSH')
    ? 'from-rose-500 to-orange-500 shadow-[0_0_10px_rgba(244,63,94,0.4)] border-rose-400/50'
    : 'from-teal-500 to-cyan-500 shadow-[0_0_10px_rgba(20,184,166,0.4)] border-teal-400/50';

  return (
    <div id={id} className={`relative z-10 flex flex-col p-4 rounded-xl border border-slate-700/60 bg-slate-800/80 backdrop-blur-md shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-500 ${width} ${glow ? 'shadow-[0_0_30px_rgba(99,102,241,0.15)] border-indigo-500/40' : ''}`}>

      {/* 动态状态徽章 */}
      {badge && (
        <div className={`absolute -top-3 left-4 bg-gradient-to-r ${badgeColor} text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full z-20 flex items-center gap-1 border`}>
          {badge}
        </div>
      )}

      {/* 无线频段图标 (右上角) */}
      <WirelessIcons wireless={wireless} />

      <GlowingDot />

      {/* Header: Icon + Name + IP + IP Type */}
      <div className="flex items-center gap-3 mb-3 mt-1">
        <div className={`p-2.5 rounded-lg ${bg || 'bg-slate-700'} ${color || 'text-slate-300'} ring-1 ring-inset ring-white/10`}>
          <SafeIcon size={22} />
        </div>
        <div className="flex-1 min-w-0 text-left pr-8">
          <h3 className="text-[13px] font-bold text-slate-100 truncate">{name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] font-mono text-emerald-400 truncate">{ip}</span>
            <IpTypeBadge ipType={ipType} />
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-2 border-t border-slate-700/50 pt-2.5 text-left">
        {/* MAC */}
        {mac && (
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-500 font-medium">MAC</span>
            <span className="font-mono text-slate-300 tracking-wider">{mac}</span>
          </div>
        )}

        {/* Gateway */}
        {gateway && (
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-500 font-medium">Gateway</span>
            <GatewayBadge gateway={gateway} warning={warning} />
          </div>
        )}

        {/* Config / Status */}
        {config && config.length > 0 && (
          <div className="mt-1.5">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Config / Status</div>
            <div className="flex flex-wrap gap-1">
              {config.map((c, i) => (
                <span key={i} className="text-[9px] bg-slate-900/80 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/50">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Physical */}
        {physical && (
          <div className="flex justify-between items-center text-[10px] mt-1">
            <span className="text-slate-500 font-medium">Physical</span>
            <span className="text-slate-400 text-[9px]">{physical}</span>
          </div>
        )}

        {/* Ports */}
        {ports && ports.length > 0 && (
          <div className="mt-1.5">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Ports ({ports.length})</div>
            <PortsRow ports={ports} />
          </div>
        )}

        {/* Description */}
        {desc && <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">{desc}</p>}

        {/* Web UI Link */}
        {webUrl && (
          <a
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 text-[10px] text-sky-400 hover:text-sky-300 transition-colors font-medium group"
          >
            <ExternalLink size={11} className="group-hover:scale-110 transition-transform" />
            <span className="underline underline-offset-2 decoration-sky-400/30 group-hover:decoration-sky-300/60">{webUrl}</span>
          </a>
        )}
      </div>
    </div>
  );
};

const CompactDeviceCard = ({ id, name, ip, ipType, mac, icon: Icon, color, gateway }: DeviceBase) => {
  const SafeIcon = Icon || Box;
  const gwIs99 = gateway?.includes('.99');
  return (
    <div id={id} className="relative z-10 flex items-center gap-3 p-2.5 rounded-lg border border-slate-700/50 bg-slate-800/40 hover:bg-slate-700/80 hover:border-slate-600 transition-all duration-200 w-full group">
      <div className={`${color || 'text-slate-400'} group-hover:scale-110 transition-transform`}>
        <SafeIcon size={18} />
      </div>
      <div className="flex flex-col flex-1 min-w-0 text-left">
        <span className="text-[11px] font-semibold text-slate-200 truncate">{name}</span>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[10px] font-mono text-emerald-400/90">{ip}</span>
          {ipType && <IpTypeBadge ipType={ipType} />}
          {gateway && (
            <span className={`text-[8px] font-mono font-bold px-1 py-0 rounded ${gwIs99 ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
              GW{gateway}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 连线绘制相关 ---
interface LineData extends Connection {
  d: string;
}

const getLineProps = (type: string) => {
  const baseClass = "fill-none transition-all duration-1000 ";
  switch (type) {
    case 'fiber':
      return { className: baseClass + "stroke-slate-400 stroke-[2px]", dash: "", anim: false };
    case 'ethernet':
      return { className: baseClass + "stroke-blue-400/80 stroke-[2px]", dash: "", anim: true };
    case 'management':
      return { className: baseClass + "stroke-teal-400/80 stroke-[2px]", dash: "4, 4", anim: true };
    case 'wifi-5g':
      return { className: baseClass + "stroke-emerald-500/70 stroke-[2px]", dash: "6, 6", anim: true };
    case 'wifi-24g':
      return { className: baseClass + "stroke-amber-500/70 stroke-[2px]", dash: "6, 6", anim: true };
    case 'wifi-24g-faded':
      return { className: baseClass + "stroke-amber-700/40 stroke-[2px]", dash: "8, 8", anim: false };
    case 'virtual':
      return { className: baseClass + "stroke-sky-400/80 stroke-[2.5px]", dash: "6, 6", anim: true };
    default:
      return { className: baseClass + "stroke-slate-600 stroke-[2px]", dash: "", anim: false };
  }
};

// --- Main Component ---
export default function NetworkTopology() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LineData[]>([]);

  const drawLines = useCallback(() => {
    if (!containerRef.current) return;
    const newLines: LineData[] = [];
    const containerRect = containerRef.current.getBoundingClientRect();

    const getRect = (id: string) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        left: rect.left - containerRect.left,
        right: rect.right - containerRect.left,
        top: rect.top - containerRect.top,
        bottom: rect.bottom - containerRect.top,
        cx: rect.left - containerRect.left + rect.width / 2,
        cy: rect.top - containerRect.top + rect.height / 2,
      };
    };

    connections.forEach(conn => {
      const r1 = getRect(conn.from);
      const r2 = getRect(conn.to);
      if (!r1 || !r2) return;

      let p1: { x: number; y: number };
      let p2: { x: number; y: number };

      if (conn.anchor === 'right-left') {
        p1 = { x: r1.right, y: r1.cy };
        p2 = { x: r2.left, y: r2.cy };
      } else if (conn.anchor === 'top-bottom') {
        p1 = { x: r1.cx, y: r1.top };
        p2 = { x: r2.cx, y: r2.bottom };
      } else if (conn.anchor === 'bottom-top') {
        p1 = { x: r1.cx, y: r1.bottom };
        p2 = { x: r2.cx, y: r2.top };
      } else if (conn.anchor === 'bottom-bottom') {
        p1 = { x: r1.cx, y: r1.bottom };
        p2 = { x: r2.cx, y: r2.bottom };
      } else {
        p1 = { x: r1.cx, y: r1.cy };
        p2 = { x: r2.cx, y: r2.cy };
      }

      let d = '';
      const dx = Math.abs(p1.x - p2.x);
      const dy = Math.abs(p1.y - p2.y);

      if (conn.route === 'z-v') {
        const safeY = p1.y + (p2.y - p1.y) * 0.4;
        d = `M ${p1.x} ${p1.y} L ${p1.x} ${safeY} L ${p2.x} ${safeY} L ${p2.x} ${p2.y}`;
      } else if (conn.route === 'bridge-bottom') {
        const downY = Math.max(p1.y, p2.y) + 30;
        d = `M ${p1.x} ${p1.y} L ${p1.x} ${downY} L ${p2.x} ${downY} L ${p2.x} ${p2.y}`;
      } else if (dx < 5 || dy < 5) {
        d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
      } else {
        const midY = p1.y + (p2.y - p1.y) / 2;
        if (conn.anchor === 'bottom-top' || conn.anchor === 'top-bottom') {
          d = `M ${p1.x} ${p1.y} L ${p1.x} ${midY} L ${p2.x} ${midY} L ${p2.x} ${p2.y}`;
        } else {
          const midX = p1.x + (p2.x - p1.x) / 2;
          d = `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
        }
      }

      newLines.push({ ...conn, d });
    });
    setLines(newLines);
  }, []);

  useEffect(() => {
    const timer = setTimeout(drawLines, 500);
    window.addEventListener('resize', drawLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', drawLines);
    };
  }, [drawLines]);

  return (
    <div className="bg-[#0B1120] text-slate-200 p-8 font-sans overflow-x-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1120] to-[#0B1120] rounded-2xl my-8">
      <div className="max-w-[1700px] mx-auto min-w-[1400px] relative pb-16" ref={containerRef}>

        {/* Header */}
        <div className="flex justify-between items-end mb-16 z-30 relative bg-slate-800/30 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-lg">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Activity className="text-emerald-400" size={28} />
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">网络拓扑监控中心</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium">HomeLab & 智能家居混合网络全景拓扑大屏</p>
          </div>
          <div className="flex gap-4 text-xs font-medium bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/50 shadow-inner">
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-slate-400 rounded-full"></div><span>光纤实线</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div><span>网线直连</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-teal-400 rounded-full border border-dashed border-teal-300"></div><span>LAN管理线</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-sky-400 rounded-full border border-dashed border-sky-300"></div><span>虚拟网桥</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-emerald-500 rounded-full border border-dashed border-emerald-400"></div><span>5G 虚线</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-amber-500 rounded-full border border-dashed border-amber-400"></div><span>2.4G 虚线</span></div>
          </div>
        </div>

        {/* SVG Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 drop-shadow-md" style={{ minHeight: '1400px' }}>
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {lines.map((line, idx) => {
            const props = getLineProps(line.type);
            return (
              <g key={idx}>
                <path d={line.d} className={props.className} strokeDasharray={props.dash} />
                {props.anim && (
                  <path d={line.d} className={props.className} strokeDasharray={props.dash} filter="url(#glow)">
                    <animate attributeName="stroke-dashoffset" values="20;0" dur="1s" repeatCount="indefinite" />
                  </path>
                )}
              </g>
            );
          })}
        </svg>

        {/* GRID Layout */}
        <div className="grid grid-cols-[140px_380px_440px_380px] gap-x-10 gap-y-16 relative z-10 items-center">

          {/* ROW 1 */}
          <div className="col-start-3 flex justify-center w-full relative">
            <ProNodeCard {...devices.core[2]} width="w-56" />
          </div>
          <div className="col-start-4 flex justify-center w-full self-end relative pb-4">
            <div id="group-bluetooth" className="border-2 border-slate-600/50 rounded-2xl p-5 bg-slate-800/30 w-full shadow-lg relative">
              <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2 text-sm">
                <Zap size={16} className="text-blue-400" /> 蓝牙设备
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {devices.bluetooth.map(dev => <CompactDeviceCard key={dev.id} {...dev} color="text-slate-400" />)}
              </div>
            </div>
          </div>

          {/* ROW 2 */}
          <div className="col-start-1 flex justify-end w-full">
            <div id="internet" className="flex items-center justify-center gap-2 text-slate-300 font-bold bg-slate-800/80 px-5 py-3 rounded-[2rem] border-2 border-slate-600 shadow-lg w-full relative">
              <Globe size={18} className="text-blue-400" /> Internet
            </div>
          </div>
          <div className="col-start-2 flex justify-center w-full relative">
            <ProNodeCard {...devices.core[0]} width="w-56" />
          </div>
          <div className="col-start-3 flex justify-center w-full relative">
            <div className="absolute -inset-10 bg-indigo-900/10 rounded-[3rem] blur-xl -z-10"></div>
            <ProNodeCard {...devices.core[1]} glow={true} width="w-72" />
          </div>
          <div className="col-start-4 flex justify-center w-full relative">
            <div id="group-24g" className="border-2 border-amber-500/30 rounded-2xl p-5 bg-amber-950/20 w-full shadow-lg relative">
              <h3 className="text-amber-400 font-bold mb-4 flex items-center gap-2 text-sm">
                <Wifi size={16} /> 2.4G 设备大区
              </h3>
              <div className="mb-4">
                <ProNodeCard {...devices.hub} width="w-full" bg="bg-amber-500/20" color="text-amber-400" />
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {devices.wifi24g.map(dev => <CompactDeviceCard key={dev.id} {...dev} color="text-amber-500" />)}
              </div>
            </div>
          </div>

          {/* ROW 3 */}
          <div className="col-start-2 flex justify-center w-full self-start relative">
            <div id="nas-container" className="border-2 border-cyan-500/40 rounded-2xl p-5 bg-slate-900/80 shadow-2xl w-full min-h-[200px] relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><HardDrive size={24} /></div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-100 text-sm">绿联私有云 NAS</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-emerald-400 text-[10px]">192.168.123.15</span>
                    <IpTypeBadge ipType="static" />
                    <GatewayBadge gateway=".6" />
                  </div>
                </div>
                <a href="http://192.168.123.15" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 transition-colors">
                  <ExternalLink size={14} />
                </a>
              </div>
              <div className="flex items-center gap-1.5 mb-4 text-[9px]">
                <span className="bg-slate-900/80 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/50">绿联 DX4600+</span>
                <span className="bg-slate-900/80 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/50">4Bay NAS</span>
                <span className="flex items-center gap-0.5 bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  <Cable size={8} /> ETH ↑
                </span>
              </div>
              <div className="border-t-2 border-dashed border-slate-700 pt-5 relative">
                <div className="absolute -top-3 left-6 bg-slate-900 px-2 text-[10px] text-slate-400 flex items-center gap-1">
                  <Box size={12} /> Docker (Host)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <a href="http://192.168.123.15:8123" target="_blank" rel="noopener noreferrer" className="flex flex-col bg-slate-800 p-2.5 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-colors group cursor-pointer">
                    <span className="text-xs text-blue-300 font-bold mb-1.5 truncate group-hover:text-blue-200 flex items-center gap-1">Home Assistant <ExternalLink size={9} className="opacity-0 group-hover:opacity-100" /></span>
                    <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 w-fit border border-slate-700/30">:8123</span>
                  </a>
                  <a href="http://192.168.123.15:8080" target="_blank" rel="noopener noreferrer" className="flex flex-col bg-slate-800 p-2.5 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-colors group cursor-pointer">
                    <span className="text-xs text-blue-300 font-bold mb-1.5 truncate group-hover:text-blue-200 flex items-center gap-1">qBittorrent <ExternalLink size={9} className="opacity-0 group-hover:opacity-100" /></span>
                    <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 w-fit border border-slate-700/30">:6881/:8080</span>
                  </a>
                  <a href="http://192.168.123.15:5244" target="_blank" rel="noopener noreferrer" className="flex flex-col bg-slate-800 p-2.5 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 transition-colors group cursor-pointer">
                    <span className="text-xs text-blue-300 font-bold mb-1.5 truncate group-hover:text-blue-200 flex items-center gap-1">Alist <ExternalLink size={9} className="opacity-0 group-hover:opacity-100" /></span>
                    <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 w-fit border border-slate-700/30">:5244/:5245</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="col-start-3 flex justify-center w-full self-start relative">
            <ProNodeCard {...devices.core[3]} width="w-56" />
          </div>
          <div className="col-start-4 flex justify-center w-full self-start relative">
            <div id="group-5g" className="border-2 border-emerald-500/30 rounded-2xl p-5 bg-emerald-950/20 w-full shadow-lg relative">
              <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 text-sm">
                <Wifi size={16} /> 5G 互联设备
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {devices.wifi5g.slice(0, 4).map(dev => <CompactDeviceCard key={dev.id} {...dev} color="text-emerald-500" />)}
                <div className="text-xs text-slate-500 text-center mt-2">+ 其他节点...</div>
              </div>
            </div>
          </div>

          {/* ROW 4 — PVE */}
          <div className="col-start-3 col-span-2 flex justify-start w-full self-start relative mt-4">
            <div id="pve-container" className="border-2 border-sky-500/40 rounded-2xl p-6 bg-slate-900/60 backdrop-blur-md shadow-2xl w-[750px] flex flex-row items-stretch justify-between gap-6 relative">
              <div className="border border-slate-600 rounded-xl p-5 bg-slate-800/60 flex flex-col w-[55%] relative z-10">
                <div className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <Monitor size={16} /> 软路由虚拟机 / VM
                </div>
                <div className="flex flex-row items-stretch gap-4 h-full relative z-10">
                  <div className="flex flex-col justify-between gap-4 w-[65%]">
                    <ProNodeCard id="ubuntu" {...devices.servers[2]} width="w-full" bg="bg-orange-500/20" />
                    <ProNodeCard id="openwrt-vm" {...devices.servers[3]} width="w-full" bg="bg-indigo-500/20" />
                  </div>
                  <div className="flex flex-col justify-between gap-4 w-[35%] relative">
                    <div id="veth-ubuntu" className="flex flex-col items-center justify-center p-2 bg-slate-900/90 border border-slate-600 rounded-xl w-full flex-1 shadow-inner">
                      <Network size={20} className="text-sky-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-300">vETH</span>
                    </div>
                    <div id="veth-openwrt" className="flex flex-col items-center justify-center p-2 bg-slate-900/90 border border-slate-600 rounded-xl w-full flex-1 shadow-inner">
                      <Network size={20} className="text-sky-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-300">vETH</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-6 justify-start pl-4 text-[10px] font-bold">
                  <div className="flex flex-col items-center gap-1.5 text-emerald-400"><Cable size={16} />ETH0 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]"></span></div>
                  <div className="flex flex-col items-center gap-1.5 text-slate-500"><Cable size={16} />ETH1</div>
                  <div className="flex flex-col items-center gap-1.5 text-slate-500"><Cable size={16} />ETH2</div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center w-[15%] relative z-10">
                <div id="vmbr0-node" className="flex flex-col items-center justify-center border-2 border-sky-500/50 bg-sky-900/40 p-4 rounded-xl w-full shadow-[0_0_15px_rgba(14,165,233,0.3)] relative">
                  <Link2 size={28} className="text-sky-400 mb-2" />
                  <span className="text-[13px] font-bold text-slate-200">vmbr0</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center w-[25%] relative z-10">
                <div id="pve-cpu-node" className="flex flex-col items-center justify-center border border-slate-600 bg-slate-800/80 p-5 rounded-xl w-full h-full shadow-lg relative">
                  <div className="text-sky-400 text-xs font-mono tracking-widest mb-2 text-center leading-relaxed">LAN IP:<br />192.168.123.66</div>
                  <div className="flex items-center gap-1 mb-2">
                    <IpTypeBadge ipType="static" />
                    <GatewayBadge gateway=".6" />
                  </div>
                  <Cpu size={44} className="text-blue-400 mb-2" />
                  <div className="font-bold text-sm tracking-widest text-slate-200 text-center mb-1">PVE服务器</div>
                  <div className="text-[8px] text-slate-400 mb-2">x86 迷你主机 | 3×ETH</div>
                  <div className="flex gap-1 mb-2">
                    {['ETH0 ↑', 'ETH1', 'ETH2'].map((p, i) => (
                      <span key={i} className={`text-[7px] font-mono px-1 py-0.5 rounded border ${i === 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{p}</span>
                    ))}
                  </div>
                  <a href="https://192.168.123.66:8006" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] text-sky-400 hover:text-sky-300 transition-colors">
                    <ExternalLink size={10} /> Web UI :8006
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
