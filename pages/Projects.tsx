
import React, { useRef, useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { formatDate, formatCurrency, calculateInterest } from '../utils/helpers';
import { Plus, FolderKanban, Coins, Loader2, X, Check, FileSpreadsheet, Edit2, Eye, Calendar, Save, Tag, Type, Trash2 } from 'lucide-react';
import { Project, Transaction, TransactionStatus } from '../types';
import api from '../services/api';

interface ProjectsProps {
  projects: Project[];
  transactions: Transaction[];
  interestRate?: number;
  onImport: (project: Project, transactions: Transaction[]) => void;
  onUpdateProject: (updatedProject: Project) => void;
  onViewDetails: (projectCode: string) => void;
  onReloadData?: () => Promise<void>; // Add callback to reload data after import
}

interface PreviewData {
  project: Project;
  transactions: Transaction[];
  rawRows: any[]; 
}

export const Projects: React.FC<ProjectsProps> = ({ projects, transactions, interestRate = 0, onImport, onUpdateProject, onViewDetails, onReloadData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  
  // State for Editing
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Stats Calculation
  const totalProjects = projects.length;

  // Tổng ngân sách gốc = sum of all project budgets (original values)
  const totalBudget = projects.reduce((sum, p) => sum + p.totalBudget, 0);

  // Tính tổng ngân sách thực tế (gốc + lãi + bổ sung)
  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalSupplementary = 0;

  projects.forEach(project => {
    const projectTrans = transactions.filter(t => t.projectId === project.id);
    projectTrans.forEach(t => {
      if (!t.compensation?.totalApproved) return;
      totalPrincipal += t.compensation.totalApproved;
      totalSupplementary += t.supplementaryAmount || 0;

      const baseDate = t.effectiveInterestDate || project.interestStartDate;
      if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
        totalInterest += calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
      } else if (t.status !== TransactionStatus.DISBURSED) {
        totalInterest += calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
      }
    });
  });

  const actualTotalBudget = totalPrincipal + totalInterest + totalSupplementary;

  const handleNewProjectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Chỉ chấp nhận file Excel (.xlsx, .xls)');
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to backend
      const result = await api.upload.uploadExcel(file);

      const newProjectId = `p-${Date.now()}`;
      const now = new Date();
      const todayStr = now.toISOString();
      const parsedData = result.rows || [];

      if (parsedData.length === 0) {
        alert('File không có dữ liệu hoặc format không đúng');
        setIsUploading(false);
        return;
      }

      const totalBudget = result.totalAmount || parsedData.reduce((sum: number, row: any) => sum + (row.tongSoTien || row.amount || row.totalApproved || 0), 0);

      // Create new project from parsed data (use first row data)
      const firstRow = parsedData[0] || {};

      // Calculate default interest start date (2 days from now)
      const defaultInterestStartDate = new Date(now);
      defaultInterestStartDate.setDate(defaultInterestStartDate.getDate() + 2);

      const newProject: Project = {
        id: newProjectId,
        code: firstRow.maDuAn || firstRow.projectCode || `DA-${Date.now()}`,
        name: firstRow.tenDuAn || firstRow.projectName || 'Dự án mới',
        location: firstRow.location || '',
        totalBudget: totalBudget,
        startDate: todayStr,
        uploadDate: todayStr, // Upload date is always current time
        interestStartDate: defaultInterestStartDate.toISOString().split('T')[0], // Default 2 days from now, user can customize
        status: 'Active'
      };

      // Convert parsed data to Transaction objects
      const newTransactions: Transaction[] = parsedData.map((row: any, index: number) => ({
        id: `TX-${Date.now()}-${index}`,
        projectId: newProjectId,
        status: TransactionStatus.PENDING,
        household: {
          id: row.maHoDan || row.maHo || `HH-${Date.now()}-${index}`,
          name: row.name || '',
          cccd: '', // Not in new template
          address: '',
          landOrigin: '',
          landArea: 0,
          decisionNumber: row.soQD || row.qd || '',
          decisionDate: row.ngay || row.date || new Date().toISOString()
        },
        compensation: {
          landAmount: 0,
          assetAmount: 0,
          houseAmount: 0,
          supportAmount: 0,
          totalApproved: row.tongSoTien || row.amount || 0
        },
        // Store additional fields from new template
        metadata: {
          spa: row.spa,
          sttDS: row.sttDS,
          quyetDinh: row.quyetDinh,
          loaiChiTra: row.loaiChiTra
        }
      }));

      setPreviewData({
        project: newProject,
        transactions: newTransactions,
        rawRows: parsedData
      });

      setIsUploading(false);
    } catch (error: any) {
      console.error('Upload failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(error.response?.data?.error || error.message || 'Upload thất bại. Vui lòng kiểm tra file Excel.');
      setIsUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProjectInfoChange = (field: keyof Project, value: string) => {
    setPreviewData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        project: {
          ...prev.project,
          [field]: value
        }
      };
    });
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    setIsUploading(true);

    try {
      // Prepare project data for API
      const projectData = {
        code: previewData.project.code,
        name: previewData.project.name,
        location: previewData.project.location,
        totalBudget: previewData.project.totalBudget,
        startDate: previewData.project.startDate,
        uploadDate: previewData.project.uploadDate,
        interestStartDate: previewData.project.interestStartDate,
        status: previewData.project.status,
      };

      // Prepare transactions data (combined household + amount)
      const transactionsData = previewData.transactions.map((tx) => ({
        householdId: tx.household.id,
        name: tx.household.name,
        cccd: tx.household.cccd,
        address: tx.household.address,
        landOrigin: tx.household.landOrigin,
        landArea: tx.household.landArea,
        decisionNumber: tx.household.decisionNumber,
        decisionDate: tx.household.decisionDate,
        amount: tx.compensation.totalApproved,
        metadata: tx.metadata, // Include metadata (loaiChiTra, spa, sttDS, etc.)
      }));

      // Call API to confirm import (creates project, households, transactions)
      await api.upload.confirmImport({
        projectData,
        transactionsData,
      });

      alert(`Đã import thành công ${previewData.transactions.length} hồ sơ!`);
      setPreviewData(null);

      // Reload data from backend
      if (onReloadData) {
        await onReloadData();
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      const errorMsg = error.response?.data?.error || 'Import thất bại';
      const errorDetails = error.response?.data?.details || '';
      alert(`${errorMsg}${errorDetails ? `: ${errorDetails}` : '. Vui lòng thử lại.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
  };

  const openEditModal = (project: Project) => {
    // Normalize interestStartDate to "YYYY-MM-DD" format for date input
    const normalizedProject = {
      ...project,
      interestStartDate: project.interestStartDate 
        ? (project.interestStartDate.includes('T') 
            ? project.interestStartDate.split('T')[0] 
            : project.interestStartDate)
        : project.interestStartDate
    };
    setEditingProject(normalizedProject);
  };

  const saveProjectUpdate = () => {
    if (editingProject) {
      // Convert date from "YYYY-MM-DD" to ISO-8601 DateTime format for Prisma
      // Only convert if date exists and is in "YYYY-MM-DD" format (not already ISO)
      let interestStartDate: string | undefined = editingProject.interestStartDate;
      
      if (interestStartDate && interestStartDate.trim() !== '') {
        // If it's already in ISO format, keep it as is
        if (interestStartDate.includes('T')) {
          // Already ISO format, use as is
        } 
        // If it's in "YYYY-MM-DD" format, convert to ISO DateTime
        else if (interestStartDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Convert "YYYY-MM-DD" to ISO DateTime (set to midnight UTC)
          interestStartDate = new Date(interestStartDate + 'T00:00:00.000Z').toISOString();
        }
      } else {
        // Empty date - don't send it (backend will keep existing value)
        interestStartDate = undefined;
      }
      
      const projectToUpdate = {
        ...editingProject,
        interestStartDate
      };
      onUpdateProject(projectToUpdate);
      setEditingProject(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa dự án "${project.name}"?\n\n` +
      `Mã dự án: ${project.code}\n` +
      `Tổng ngân sách: ${formatCurrency(project.totalBudget)}\n\n` +
      `Hành động này không thể hoàn tác!`
    );

    if (!confirmed) return;

    try {
      await api.projects.delete(projectId);
      alert(`Đã xóa dự án "${project.name}" thành công!`);

      // Reload data from backend
      if (onReloadData) {
        await onReloadData();
      }
    } catch (error: any) {
      console.error('Delete project failed:', error);
      alert(error.response?.data?.error || 'Xóa dự án thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* Main Header */}
      <div className="flex justify-between items-end pb-2">
        <div>
          <h2 className="text-2xl font-medium text-black tracking-tight">Quản lý dự án</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Danh sách dự án & tiến độ đền bù</p>
        </div>
        <button 
            onClick={handleNewProjectClick}
            disabled={isUploading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={3} />}
          <span>{isUploading ? 'ĐANG XỬ LÝ...' : 'DỰ ÁN MỚI'}</span>
        </button>
      </div>

      {/* Stats Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard hoverEffect className="flex items-center gap-5 p-6 border-slate-200">
            <div className="p-3 rounded-lg bg-blue-600/10 border border-blue-600 text-blue-600">
                <FolderKanban size={24} strokeWidth={2} />
            </div>
            <div>
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Tổng số dự án</p>
                <p className="text-xl font-semibold text-black tracking-tight mt-0.5">{totalProjects}</p>
                <p className="text-[11px] font-medium text-slate-500 mt-1">Đã tải lên hệ thống</p>
            </div>
        </GlassCard>

        <GlassCard hoverEffect className="flex items-center gap-5 p-6 border-slate-200">
            <div className="p-3 rounded-lg bg-emerald-600/10 border border-emerald-600 text-emerald-600">
                <Coins size={24} strokeWidth={2} />
            </div>
            <div>
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">Tổng ngân sách</p>
                <p className="text-xl font-semibold text-black tracking-tight mt-0.5">{formatCurrency(actualTotalBudget)}</p>
                {(totalInterest > 0 || totalSupplementary > 0) && (
                  <p className="text-[10px] font-medium text-slate-500 mt-1">
                    Gốc: {formatCurrency(totalPrincipal)}
                    {totalInterest > 0 && <span className="text-emerald-600"> + Lãi: {formatCurrency(totalInterest)}</span>}
                    {totalSupplementary > 0 && <span className="text-blue-600"> + Bổ sung: {formatCurrency(totalSupplementary)}</span>}
                  </p>
                )}
                {totalInterest === 0 && totalSupplementary === 0 && (
                  <p className="text-[11px] font-medium text-slate-500 mt-1">Tổng giá trị các dự án</p>
                )}
            </div>
        </GlassCard>
      </div>

      {/* MAIN PROJECT TABLE */}
      <GlassCard className="overflow-hidden p-0 border-slate-300 shadow-sm mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-700 uppercase font-bold bg-slate-100 border-b border-slate-200 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3.5 text-center w-12 border-r border-slate-200">STT</th>
                <th className="px-4 py-3.5 border-r border-slate-200">Mã dự án</th>
                <th className="px-4 py-3.5 border-r border-slate-200">Tên dự án</th>
                <th className="px-4 py-3.5 text-right border-r border-slate-200">Tổng ngân sách</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-200">Ngày Upload</th>
                <th className="px-4 py-3.5 text-center border-r border-slate-200">Ngày GN & Tính lãi</th>
                <th className="px-4 py-3.5 w-40 border-r border-slate-200">Tiến độ</th>
                <th className="px-4 py-3.5 text-center w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {projects.map((project, index) => {
                 // Calculate Progress - bao gồm cả tiền bổ sung + lãi phát sinh
                 const projectTrans = transactions.filter(t => t.projectId === project.id);
                 const disbursed = projectTrans
                   .filter(t => t.status === TransactionStatus.DISBURSED)
                   .reduce((acc, t) => {
                     if (!t.compensation?.totalApproved) return acc;
                     const supplementary = t.supplementaryAmount || 0;
                     const baseDate = t.effectiveInterestDate || project.interestStartDate;
                     const interest = t.disbursementDate
                       ? calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate))
                       : 0;
                     return acc + t.compensation.totalApproved + interest + supplementary;
                   }, 0);

                 // Tính tổng giá trị dự án thực tế (bao gồm tiền bổ sung + lãi phát sinh)
                 const actualTotalBudget = projectTrans.reduce((sum, t) => {
                   if (!t.compensation?.totalApproved) return sum;
                   const supplementary = t.supplementaryAmount || 0;
                   const baseDate = t.effectiveInterestDate || project.interestStartDate;
                   let interest = 0;
                   if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
                     interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
                   } else if (t.status !== TransactionStatus.DISBURSED) {
                     interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
                   }
                   return sum + t.compensation.totalApproved + interest + supplementary;
                 }, 0);
                 
                 const percent = actualTotalBudget > 0 ? (disbursed / actualTotalBudget) * 100 : 0;
                 const percentStr = percent.toFixed(1);

                 return (
                   <tr key={project.id} className="hover:bg-blue-50/30 transition-colors">
                     <td className="px-4 py-3 text-center text-slate-700 font-bold border-r border-slate-200">{index + 1}</td>
                     <td className="px-4 py-3 border-r border-slate-200">
                       <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                         {project.code}
                       </span>
                     </td>
                     <td className="px-4 py-3 border-r border-slate-200">
                       <p className="text-slate-900 font-bold">{project.name}</p>
                     </td>
                     <td className="px-4 py-3 text-right border-r border-slate-200">
                       <p className="font-bold text-slate-800">{formatCurrency(actualTotalBudget)}</p>
                       {(() => {
                         const pInterest = projectTrans.reduce((sum, t) => {
                           if (!t.compensation?.totalApproved) return sum;
                           const baseDate = t.effectiveInterestDate || project.interestStartDate;
                           if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
                             return sum + calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
                           } else if (t.status !== TransactionStatus.DISBURSED) {
                             return sum + calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
                           }
                           return sum;
                         }, 0);
                         const pSupp = projectTrans.reduce((sum, t) => sum + (t.supplementaryAmount || 0), 0);
                         if (pInterest > 0 || pSupp > 0) {
                           return (
                             <p className="text-[9px] text-slate-500 mt-0.5">
                               Gốc: {formatCurrency(project.totalBudget)}
                               {pInterest > 0 && <span className="text-emerald-600"> +{formatCurrency(Math.round(pInterest))}</span>}
                               {pSupp > 0 && <span className="text-blue-600"> +{formatCurrency(pSupp)}</span>}
                             </p>
                           );
                         }
                         return null;
                       })()}
                     </td>
                     <td className="px-4 py-3 text-center text-xs text-slate-700 font-medium border-r border-slate-200">
                        {(() => {
                          const formatted = project.uploadDate ? formatDate(project.uploadDate) : '';
                          return formatted || '-';
                        })()}
                     </td>
                     <td className="px-4 py-3 text-center text-xs font-bold text-blue-700 bg-blue-50/50 mx-2 border-r border-slate-200">
                        {(() => {
                          const formatted = project.interestStartDate ? formatDate(project.interestStartDate) : '';
                          return formatted || 'Chưa thiết lập';
                        })()}
                     </td>
                     <td className="px-4 py-3 border-r border-slate-200">
                        <div className="flex items-center gap-2">
                           <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-200">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }}></div>
                           </div>
                           <span className="text-[10px] font-bold text-emerald-700 w-8">{percentStr}%</span>
                        </div>
                     </td>
                     <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <button
                             onClick={() => openEditModal(project)}
                             className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all border border-transparent hover:border-blue-200"
                             title="Cập nhật dự án"
                           >
                              <Edit2 size={16} strokeWidth={2} />
                           </button>
                           <button
                             onClick={() => onViewDetails(project.code)}
                             className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all border border-transparent hover:border-emerald-200"
                             title="Xem chi tiết"
                           >
                              <Eye size={16} strokeWidth={2} />
                           </button>
                           <button
                             onClick={() => handleDeleteProject(project.id)}
                             className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all border border-transparent hover:border-red-200"
                             title="Xóa dự án"
                           >
                              <Trash2 size={16} strokeWidth={2} />
                           </button>
                        </div>
                     </td>
                   </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* EDIT PROJECT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <GlassCard className="w-[450px] bg-white p-6 shadow-2xl border-slate-300">
             <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
                <div>
                   <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                     <Edit2 size={18} className="text-blue-600" />
                     Cập nhật dự án
                   </h3>
                   <p className="text-xs font-semibold text-slate-500 mt-1 max-w-[350px] truncate">{editingProject.name}</p>
                </div>
                <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600">
                   <X size={20} />
                </button>
             </div>

             <div className="space-y-4">
               <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                    <Type size={12} /> Tên dự án
                  </label>
                  <input
                    type="text"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập tên dự án"
                  />
               </div>

               <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                    <Tag size={12} /> Mã dự án
                  </label>
                  <input
                    type="text"
                    value={editingProject.code}
                    onChange={(e) => setEditingProject({...editingProject, code: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập mã dự án"
                  />
               </div>

               <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                    <Calendar size={12} /> Ngày Giải Ngân & Tính Lãi
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={editingProject.interestStartDate ? (editingProject.interestStartDate.includes('T') ? editingProject.interestStartDate.split('T')[0] : editingProject.interestStartDate) : ''}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setEditingProject({...editingProject, interestStartDate: newDate});
                      }}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 italic font-medium">
                    * Mốc thời gian để tính lãi tự động cho hồ sơ chưa nhận tiền.
                  </p>
               </div>
             </div>

             <div className="flex justify-end gap-3 mt-8">
                <button 
                  onClick={() => setEditingProject(null)} 
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={saveProjectUpdate} 
                  className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                >
                  <Save size={14} /> Lưu thay đổi
                </button>
             </div>
          </GlassCard>
        </div>
      )}


      {/* PREVIEW MODAL */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
          <GlassCard className="w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-slate-300 bg-white/95">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg border border-blue-200">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Xác nhận nhập dữ liệu</h3>
                  <p className="text-xs text-slate-500 font-bold">Vui lòng kiểm tra kỹ thông tin trích xuất từ file Excel trước khi lưu.</p>
                </div>
              </div>
              <button 
                onClick={handleCancelPreview}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Scrollable Area */}
            <div className="flex-1 overflow-hidden flex flex-col p-5 bg-slate-50/30">
              
              {/* Project Info Summary (Editable) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                 <div className="sm:col-span-1 relative group">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                      Tên dự án <Edit2 size={10} className="text-slate-400" />
                    </label>
                    <input
                      value={previewData.project.name}
                      onChange={(e) => handleProjectInfoChange('name', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all shadow-sm"
                    />
                 </div>
                 <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                      Mã dự án <Edit2 size={10} className="text-slate-400" />
                    </label>
                    <input
                      value={previewData.project.code}
                      onChange={(e) => handleProjectInfoChange('code', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all shadow-sm"
                    />
                 </div>
                 <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                       Ngày GN & Tính lãi <Edit2 size={10} className="text-slate-400" />
                    </label>
                    <input
                      type="date"
                      value={previewData.project.interestStartDate ? previewData.project.interestStartDate.split('T')[0] : ''}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        handleProjectInfoChange('interestStartDate', newDate);
                      }}
                      className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all shadow-sm"
                    />
                 </div>
                 <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Tổng ngân sách dự kiến</label>
                    <input
                      readOnly
                      value={formatCurrency(previewData.project.totalBudget)}
                      className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-emerald-700 focus:outline-none text-right cursor-not-allowed"
                    />
                 </div>
              </div>

              {/* Data Table with Freeze Panes */}
              <div className="flex-1 overflow-auto border border-slate-300 rounded-lg bg-white shadow-inner custom-scrollbar relative">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-slate-100 sticky top-0 z-30 shadow-sm border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 text-center w-10 bg-slate-100 sticky left-0 z-40">STT</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[50px] text-center">SPA</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[60px] text-center">STT DS</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[180px]">Họ và tên</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[130px]">Số QĐ</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[90px]">Ngày</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[200px]">Tên dự án</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[100px]">Mã dự án</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[110px]">Loại Chi Trả</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200 min-w-[160px]">Mã Hộ Dân</th>
                      <th className="p-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-slate-200 text-right min-w-[140px] bg-slate-50 sticky right-0 z-40 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)]">Tổng số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-300">
                    {previewData.rawRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors even:bg-slate-50/30">
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-600 text-[10px] sticky left-0 bg-white z-20 group-hover:bg-blue-50/50">{row.stt || idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 text-center text-slate-700 text-[10px]">{row.spa || '-'}</td>
                        <td className="p-2 border-r border-slate-200 text-center text-slate-700 text-[10px]">{row.sttDS || '-'}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-800 text-[11px]">{row.name}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700 font-medium text-[10px]">{row.soQD || row.qd || '-'}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700 font-medium text-[10px]">{row.ngay || row.date || '-'}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700 font-medium text-[10px]">{row.tenDuAn || '-'}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700 font-mono font-bold text-[10px]">{row.maDuAn || row.projectCode || '-'}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700 font-medium text-[10px]">{row.loaiChiTra || '-'}</td>
                        <td className="p-2 border-r border-slate-200 font-mono text-slate-600 font-semibold text-[10px]">{row.maHoDan || row.maHo || '-'}</td>
                        <td className="p-2 text-right font-bold text-emerald-700 bg-white sticky right-0 z-20 border-l border-slate-200 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.05)] group-hover:bg-blue-50/50 text-[11px]">
                          {formatCurrency(row.tongSoTien || row.amount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 text-right italic font-medium">
                * Hiển thị {previewData.rawRows.length} bản ghi
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3">
              <button 
                onClick={handleCancelPreview}
                className="px-5 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmImport}
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
              >
                <Check size={16} strokeWidth={3} />
                Xác nhận nhập
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
