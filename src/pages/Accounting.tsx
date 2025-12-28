import React, { useEffect, useState } from 'react';
import { Card, Table, Tabs, Statistic, Button, message, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { apiFetch } from '../../lib/api';

type RevenueItem = {
  txHash: string;
  address: string;
  amount: string;
  unit: string;
  createdAt: string;
};

type RevenueRes = {
  ok: true;
  items: RevenueItem[];
  total: string;
  totalCount: number;
};

type ExpenseItem = {
  id: string;
  address: string;
  amount: string;
  payoutTxHash: string | null;
  createdAt: string;
  updatedAt: string;
};

type ExpenseRes = {
  ok: true;
  items: ExpenseItem[];
  total: string;
  totalCount: number;
};

// CSV 导出工具函数
function exportToCSV(data: any[], filename: string, headers: string[]) {
  const csvContent = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => `"${row[h] || ''}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Accounting() {
  const [revenueData, setRevenueData] = useState<RevenueRes | null>(null);
  const [expenseData, setExpenseData] = useState<ExpenseRes | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [revenuePage, setRevenuePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const pageSize = 20;

  const loadRevenue = async (page: number = 1) => {
    setRevenueLoading(true);
    try {
      const res = await apiFetch<RevenueRes>(`/api/admin/finance/revenue?page=${page}&pageSize=${pageSize}`);
      setRevenueData(res);
    } catch (e: any) {
      message.error(e?.message || '加载收益数据失败');
    } finally {
      setRevenueLoading(false);
    }
  };

  const loadExpenses = async (page: number = 1) => {
    setExpenseLoading(true);
    try {
      const res = await apiFetch<ExpenseRes>(`/api/admin/finance/expenses?page=${page}&pageSize=${pageSize}`);
      setExpenseData(res);
    } catch (e: any) {
      message.error(e?.message || '加载支出数据失败');
    } finally {
      setExpenseLoading(false);
    }
  };

  useEffect(() => {
    loadRevenue(revenuePage);
  }, [revenuePage]);

  useEffect(() => {
    loadExpenses(expensePage);
  }, [expensePage]);

  const handleExportRevenue = () => {
    if (!revenueData || revenueData.items.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    const csvData = revenueData.items.map((item) => ({
      时间: new Date(item.createdAt).toLocaleString('zh-CN'),
      交易哈希: item.txHash,
      用户地址: item.address,
      收入金额: `${item.amount} ${item.unit}`,
    }));

    exportToCSV(csvData, `收益明细_${new Date().toISOString().split('T')[0]}.csv`, ['时间', '交易哈希', '用户地址', '收入金额']);
    message.success('导出成功');
  };

  const handleExportExpenses = () => {
    if (!expenseData || expenseData.items.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    const csvData = expenseData.items.map((item) => ({
      打款时间: new Date(item.updatedAt).toLocaleString('zh-CN'),
      用户地址: item.address,
      支出金额: `${item.amount} USDT`,
      打款哈希: item.payoutTxHash || '-',
    }));

    exportToCSV(csvData, `支出明细_${new Date().toISOString().split('T')[0]}.csv`, ['打款时间', '用户地址', '支出金额', '打款哈希']);
    message.success('导出成功');
  };

  const revenueColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '交易哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      render: (hash: string) => (
        <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noopener noreferrer">
          {hash.slice(0, 10)}...{hash.slice(-8)}
        </a>
      ),
    },
    {
      title: '用户地址',
      dataIndex: 'address',
      key: 'address',
      render: (addr: string) => (
        <a href={`https://bscscan.com/address/${addr}`} target="_blank" rel="noopener noreferrer">
          {addr.slice(0, 8)}...{addr.slice(-6)}
        </a>
      ),
    },
    {
      title: '收入金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string, record: RevenueItem) => `${amount} ${record.unit}`,
    },
  ];

  const expenseColumns = [
    {
      title: '打款时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '用户地址',
      dataIndex: 'address',
      key: 'address',
      render: (addr: string) => (
        <a href={`https://bscscan.com/address/${addr}`} target="_blank" rel="noopener noreferrer">
          {addr.slice(0, 8)}...{addr.slice(-6)}
        </a>
      ),
    },
    {
      title: '支出金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string) => `${amount} USDT`,
    },
    {
      title: '打款哈希',
      dataIndex: 'payoutTxHash',
      key: 'payoutTxHash',
      render: (hash: string | null) =>
        hash ? (
          <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noopener noreferrer">
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </a>
        ) : (
          '-'
        ),
    },
  ];

  const tabItems = [
    {
      key: 'revenue',
      label: '收益明细 (Revenue - BNB)',
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Statistic
              title="总收入 (Total Revenue)"
              value={revenueData?.total || '0'}
              suffix="BNB"
              precision={6}
              valueStyle={{ color: '#3f8600' }}
            />
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportRevenue}>
              导出 CSV
            </Button>
          </div>
          <Table
            rowKey="txHash"
            loading={revenueLoading}
            columns={revenueColumns}
            dataSource={revenueData?.items || []}
            pagination={{
              current: revenuePage,
              pageSize,
              total: revenueData?.totalCount || 0,
              onChange: (page) => setRevenuePage(page),
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Space>
      ),
    },
    {
      key: 'expenses',
      label: '支出明细 (Expenses - USDT)',
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Statistic
              title="总支出 (Total Payout)"
              value={expenseData?.total || '0'}
              prefix="$"
              suffix="USDT"
              precision={2}
              valueStyle={{ color: '#cf1322' }}
            />
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportExpenses}>
              导出 CSV
            </Button>
          </div>
          <Table
            rowKey="id"
            loading={expenseLoading}
            columns={expenseColumns}
            dataSource={expenseData?.items || []}
            pagination={{
              current: expensePage,
              pageSize,
              total: expenseData?.totalCount || 0,
              onChange: (page) => setExpensePage(page),
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Tabs defaultActiveKey="revenue" items={tabItems} />
    </Card>
  );
}

