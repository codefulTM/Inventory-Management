/**
 * TransactionManagementPage - Trang quản lý giao dịch (Wrapper)
 * Chuyển hướng sang component TransactionManagementManager
 * Trang này dành cho Manager quản lý các giao dịch tồn kho
 */
import { TransactionManagementManager } from './TransactionManagementManager';

export default function TransactionManagementPage() {
  return <TransactionManagementManager />;
}
