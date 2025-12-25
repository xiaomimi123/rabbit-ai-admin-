import { Layout, Menu, Modal, Input, Button, message } from 'antd';
import { DashboardOutlined, DollarOutlined, SettingOutlined, UserOutlined, AccountBookOutlined } from '@ant-design/icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { getAdminKey, setAdminKey } from './api';
import Dashboard from './pages/Dashboard';
import FinanceOps from './pages/FinanceOps';
import Users from './pages/Users';
import SystemConfig from './pages/SystemConfig';
import Accounting from './pages/Accounting';

const { Header, Sider, Content } = Layout;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [key, setKey] = useState(getAdminKey());
  const [open, setOpen] = useState(!getAdminKey());

  useEffect(() => {
    if (!getAdminKey()) setOpen(true);
  }, []);

  const selected = useMemo(() => {
    if (location.pathname.startsWith('/finance')) return ['finance'];
    if (location.pathname.startsWith('/users')) return ['users'];
    if (location.pathname.startsWith('/system')) return ['system'];
    if (location.pathname.startsWith('/accounting')) return ['accounting'];
    return ['dashboard'];
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible theme="dark">
        <div style={{ color: '#fff', padding: 16, fontWeight: 800 }}>Rabbit Admin</div>
        <Menu theme="dark" mode="inline" selectedKeys={selected}>
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>
            <Link to="/">仪表盘</Link>
          </Menu.Item>
          <Menu.Item key="finance" icon={<DollarOutlined />}>
            <Link to="/finance">财务审核</Link>
          </Menu.Item>
          <Menu.Item key="accounting" icon={<AccountBookOutlined />}>
            <Link to="/accounting">财务流水</Link>
          </Menu.Item>
          <Menu.Item key="users" icon={<UserOutlined />}>
            <Link to="/users">用户管理</Link>
          </Menu.Item>
          <Menu.Item key="system" icon={<SettingOutlined />}>
            <Link to="/system">系统设置</Link>
          </Menu.Item>
        </Menu>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>管理后台</div>
          <Button
            onClick={() => {
              setOpen(true);
            }}
          >
            设置 Admin Key
          </Button>
        </Header>

        <Content style={{ margin: 16 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/finance" element={<FinanceOps />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/users" element={<Users />} />
            <Route path="/system" element={<SystemConfig />} />
          </Routes>
        </Content>
      </Layout>

      <Modal
        title="输入 ADMIN_API_KEY"
        open={open}
        okText="保存"
        onCancel={() => setOpen(false)}
        onOk={() => {
          if (!key.trim()) {
            message.error('请输入 ADMIN_API_KEY');
            return;
          }
          setAdminKey(key.trim());
          setOpen(false);
          message.success('已保存');
          navigate('/');
        }}
      >
        <Input.Password value={key} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKey(e.target.value)} placeholder="Render 环境变量 ADMIN_API_KEY" />
        <div style={{ marginTop: 8, color: '#666' }}>该 Key 只保存在你的浏览器本地，不会上传到任何地方。</div>
      </Modal>
    </Layout>
  );
}


