
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Transaction, TransactionStatus, Project, User, BankAccount } from '../types';
import { formatCurrency, calculateInterest } from '../utils/helpers';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { 
  Wallet, 
  Layers, 
  TrendingUp, 
  Users, 
  UserX, 
  CheckCircle, 
  AlertCircle, 
  PiggyBank, 
  Check, 
  ChevronRight
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  projects: Project[];
  interestRate: number;
  bankAccount: BankAccount;
  setActiveTab: (tab: string) => void;
  currentUser: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, projects, interestRate, bankAccount, setActiveTab, currentUser }) => {
  const [selectedProjectIds, setSelectedProjectIds] = React.useState<string[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 450 }); // Giá trị mặc định hợp lý

  // --- Data Aggregation Logic ---

  const filteredProjects = useMemo(() => {
    if (selectedProjectIds.length === 0) return projects;
    return projects.filter(p => selectedProjectIds.includes(p.id));
  }, [projects, selectedProjectIds]);

  const filteredTransactions = useMemo(() => {
    if (selectedProjectIds.length === 0) return transactions;
    return transactions.filter(t => selectedProjectIds.includes(t.projectId));
  }, [transactions, selectedProjectIds]);

  const statsTotalProjects = filteredProjects.length;
  const statsTotalHouseholds = filteredTransactions.length;

  const statsDisbursedTrans = filteredTransactions.filter(t => t.status === TransactionStatus.DISBURSED);
  
  const statsDisbursedAmount = statsDisbursedTrans.reduce((acc, t) => {
    if (!t.compensation?.totalApproved) return acc;
    const project = projects.find(p => p.id === t.projectId);
    const baseDate = t.effectiveInterestDate || project?.interestStartDate;
    let interest = 0;
    if (t.disbursementDate) {
       interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
    }
    const supplementary = t.supplementaryAmount || 0;
    return acc + t.compensation.totalApproved + interest + supplementary;
  }, 0);
  
  const statsPendingTrans = filteredTransactions.filter(t => t.status !== TransactionStatus.DISBURSED);
  const statsPendingCount = statsPendingTrans.length;

  // Tính chi tiết tiền chưa giải ngân
  let statsPendingPrincipal = 0; // Tổng tiền gốc chưa GN
  let statsPendingInterest = 0; // Tổng lãi tạm tính
  let statsPendingSupplementary = 0; // Tổng tiền bổ sung

  const statsPendingAmount = statsPendingTrans.reduce((acc, t) => {
      if (!t.compensation?.totalApproved) return acc;
      const project = projects.find(p => p.id === t.projectId);
      const baseDate = t.effectiveInterestDate || project?.interestStartDate;
      const interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
      const supplementary = t.supplementaryAmount || 0;

      // Cộng dồn từng loại
      statsPendingPrincipal += t.compensation.totalApproved;
      statsPendingInterest += interest;
      statsPendingSupplementary += supplementary;

      return acc + t.compensation.totalApproved + interest + supplementary;
  }, 0);

  // Debug log
  console.log('📊 CHƯA GIẢI NGÂN:', {
    soHoDan: statsPendingCount,
    tienGoc: formatCurrency(statsPendingPrincipal),
    laiTamTinh: formatCurrency(statsPendingInterest),
    tienBoSung: formatCurrency(statsPendingSupplementary),
    tongCong: formatCurrency(statsPendingAmount),
    laiSuat: `${interestRate}%`
  });

  // Tổng lãi phát sinh - Link với tab Giao dịch / tab Số dư
  // CHỈ tính lãi từ các giao dịch CHƯA giải ngân (PENDING + HOLD) - Lãi tạm tính
  // Khi giải ngân, lãi của giao dịch đó sẽ được chuyển sang "đã chốt" và không còn trong tổng này
  let tempInterest = 0; // Lãi tạm tính (chưa giải ngân)
  let lockedInterest = 0; // Lãi đã chốt (đã giải ngân)
  
  transactions.forEach(t => {
    if (!t.compensation?.totalApproved) return;
    const project = projects.find(p => p.id === t.projectId);
    const baseDate = t.effectiveInterestDate || project?.interestStartDate;

    if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
      // Lãi đã chốt (không tính vào lãi phát sinh)
      lockedInterest += calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
    } else if (t.status !== TransactionStatus.DISBURSED) {
      // Lãi tạm tính (chỉ từ các giao dịch chưa giải ngân)
      tempInterest += calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
    }
  });
  
  const statsTotalInterest = tempInterest;           // Lãi tạm tính (PENDING + HOLD)
  const statsLockedInterest = lockedInterest;        // Lãi đã chốt (DISBURSED)
  const statsTotalInterestAll = statsTotalInterest + statsLockedInterest; // Tổng lãi (tạm tính + đã chốt)

  // Tổng giá trị dự án = Gốc + Lãi + Tiền bổ sung (đã GN + chưa GN)
  let statsProjectPrincipal = 0;
  let statsProjectInterest = 0;
  let statsProjectSupplementary = 0;

  const statsTotalProjectValue = filteredProjects.reduce((acc, p) => {
    const projectTrans = filteredTransactions.filter(t => t.projectId === p.id);
    const totalForProject = projectTrans.reduce((sum, t) => {
      if (!t.compensation?.totalApproved) return sum;
      const baseDate = t.effectiveInterestDate || p.interestStartDate;
      let interest = 0;
      if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
        interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
      } else if (t.status !== TransactionStatus.DISBURSED) {
        interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
      }
      const supplementary = t.supplementaryAmount || 0;

      // Cộng dồn
      statsProjectPrincipal += t.compensation.totalApproved;
      statsProjectInterest += interest;
      statsProjectSupplementary += supplementary;

      return sum + t.compensation.totalApproved + interest + supplementary;
    }, 0);
    return acc + (totalForProject > 0 ? totalForProject : p.totalBudget);
  }, 0);

  // Debug log
  console.log('📊 TỔNG GIÁ TRỊ DỰ ÁN:', {
    tienGoc: formatCurrency(statsProjectPrincipal),
    laiPhatSinh: formatCurrency(statsProjectInterest),
    tienBoSung: formatCurrency(statsProjectSupplementary),
    tongCong: formatCurrency(statsTotalProjectValue)
  });

  // Kiểm tra logic: Khi chưa giải ngân giao dịch nào, 2 giá trị này phải bằng nhau
  const countDisbursed = filteredTransactions.filter(t => t.status === TransactionStatus.DISBURSED).length;
  if (countDisbursed === 0) {
    console.log('⚠️  CHƯA CÓ GIAO DỊCH NÀO ĐƯỢC GIẢI NGÂN - So sánh:');
    console.log('  Tổng giá trị dự án:', formatCurrency(statsTotalProjectValue));
    console.log('  Tổng tiền chưa GN: ', formatCurrency(statsPendingAmount));
    console.log('  Chênh lệch:', formatCurrency(Math.abs(statsTotalProjectValue - statsPendingAmount)));
    if (statsTotalProjectValue === statsPendingAmount) {
      console.log('  ✅ Hai giá trị bằng nhau - Logic đúng!');
    } else {
      console.log('  ❌ Hai giá trị KHÁC NHAU - Cần kiểm tra logic!');
    }
  }

  // Tổng tiền tài khoản trên Dashboard (đã bao gồm lãi) =
  //   Số dư thực tế trong tài khoản (currentBalance)
  // + Lãi tạm tính của hồ sơ CHƯA giải ngân
  // + Lãi đã chốt của hồ sơ ĐÃ giải ngân.
  // Cách tính này khớp với tổng "Tiền chưa GN" + "Tiền đã GN" ở tab Giao dịch.
  const statsTotalAccountBalance = bankAccount.currentBalance + Math.round(statsTotalInterestAll);

  const projectStats = useMemo(() => {
    return projects.map(project => {
      const projectTrans = transactions.filter(t => t.projectId === project.id);
      
      const pDisbursed = projectTrans
        .filter(t => t.status === TransactionStatus.DISBURSED)
        .reduce((acc, t) => {
            if (!t.compensation?.totalApproved) return acc;
            const baseDate = t.effectiveInterestDate || project.interestStartDate;
            let interest = 0;
            if(t.disbursementDate) {
              interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
            }
            const supplementary = t.supplementaryAmount || 0;
            return acc + t.compensation.totalApproved + interest + supplementary;
        }, 0);

      const pPending = projectTrans
        .filter(t => t.status !== TransactionStatus.DISBURSED)
        .reduce((acc, t) => {
            if (!t.compensation?.totalApproved) return acc;
            const baseDate = t.effectiveInterestDate || project.interestStartDate;
            const interest = calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
            const supplementary = t.supplementaryAmount || 0;
            return acc + t.compensation.totalApproved + interest + supplementary;
        }, 0);

      const pInterest = projectTrans.reduce((acc, t) => {
        if (!t.compensation?.totalApproved) return acc;
        const baseDate = t.effectiveInterestDate || project.interestStartDate;
        if (t.status === TransactionStatus.DISBURSED && t.disbursementDate) {
          return acc + calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date(t.disbursementDate));
        } else if (t.status !== TransactionStatus.DISBURSED) {
          return acc + calculateInterest(t.compensation.totalApproved, interestRate, baseDate, new Date());
        }
        return acc;
      }, 0);
      
      const completionRate = project.totalBudget > 0 ? (pDisbursed / project.totalBudget) * 100 : 0;

      return {
        ...project,
        disbursedAmount: pDisbursed,
        pendingAmount: pPending, 
        interestAmount: pInterest,
        completionRate: parseFloat(completionRate.toFixed(1))
      };
    });
  }, [projects, transactions, interestRate]);

  const chartData = useMemo(() => {
    if (selectedProjectIds.length === 0) return projectStats;
    return projectStats.filter(p => selectedProjectIds.includes(p.id));
  }, [projectStats, selectedProjectIds]);

  const toggleProjectSelection = (id: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // Đảm bảo chart container có kích thước trước khi render
  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setChartDimensions({ width, height });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const timer = setTimeout(updateDimensions, 100); // Delay để đảm bảo DOM đã render

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
    };
  }, [selectedProjectIds, chartData]);

  const KPICard = ({ title, value, subValue, icon: Icon, colorClass }: any) => (
        <GlassCard hoverEffect className="relative flex flex-col justify-between h-full min-h-[120px] shadow-sm border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 border border-current opacity-80`}>
          <Icon size={18} className={colorClass.replace('bg-', 'text-')} strokeWidth={2} />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xl font-semibold text-black tracking-tight">{value}</p>
        </div>
        {subValue && <p className="text-[11px] font-medium text-slate-500 mt-1">{subValue}</p>}
      </div>
    </GlassCard>
  );

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const project = projects.find(p => p.code === label);
      const title = project ? project.name : label;

      return (
        <div className="bg-white/95 backdrop-blur-xl p-3 rounded-lg shadow-xl border border-slate-200 text-xs z-50">
          <p className="font-bold text-black mb-2 pb-1 border-b border-slate-200 max-w-[200px] truncate">{title}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between gap-6 mb-1.5 last:mb-0 items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600 font-medium">{entry.name}:</span>
              </div>
              <span className="font-bold text-slate-900">
                {(entry.unit === '%' || entry.name.includes('Tiến độ') || entry.name.includes('Hoàn thành'))
                  ? `${entry.value}%` 
                  : formatCurrency(entry.value as number)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const isDetailedView = selectedProjectIds.length > 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-end pb-2">
        <div>
           <h2 className="text-2xl font-medium text-black tracking-tight">Dashboard</h2>
           <p className="text-sm font-medium text-slate-500 mt-1">Tổng quan tài chính & tiến độ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="TỔNG TIỀN TÀI KHOẢN"
          value={formatCurrency(statsTotalAccountBalance)}
          subValue={`Đã bao gồm lãi (tạm tính + đã chốt)`}
          icon={Wallet} 
          colorClass="bg-blue-600 text-blue-600"
        />
        <KPICard 
          title="TỔNG SỐ DỰ ÁN" 
          value={statsTotalProjects} 
          subValue={isDetailedView ? "Đang chọn" : "Đang quản lý"}
          icon={Layers} 
          colorClass="bg-teal-600 text-teal-600"
        />
        <KPICard
          title="TỔNG GIÁ TRỊ DỰ ÁN"
          value={formatCurrency(statsTotalProjectValue)}
          subValue={`Gốc: ${formatCurrency(statsProjectPrincipal)} + Lãi: ${formatCurrency(statsProjectInterest)}`}
          icon={TrendingUp}
          colorClass="bg-purple-600 text-purple-600"
        />
        <KPICard 
          title="TỔNG SỐ HỘ DÂN" 
          value={statsTotalHouseholds} 
          subValue="Hồ sơ hệ thống"
          icon={Users} 
          colorClass="bg-sky-600 text-sky-600"
        />
        <KPICard 
          title="HỘ DÂN CHƯA NHẬN" 
          value={statsPendingCount} 
          subValue="Hồ sơ tồn"
          icon={UserX} 
          colorClass="bg-orange-600 text-orange-600"
        />
        <KPICard 
          title="ĐÃ GIẢI NGÂN" 
          value={formatCurrency(statsDisbursedAmount)} 
          subValue="Đã bao gồm lãi"
          icon={CheckCircle} 
          colorClass="bg-emerald-600 text-emerald-600"
        />
        <KPICard
          title="CHƯA GIẢI NGÂN"
          value={formatCurrency(statsPendingAmount)}
          subValue={`Gốc: ${formatCurrency(statsPendingPrincipal)} + Lãi: ${formatCurrency(statsPendingInterest)}`}
          icon={AlertCircle}
          colorClass="bg-amber-600 text-amber-600"
        />
        <KPICard 
          title="LÃI PHÁT SINH" 
          value={formatCurrency(statsTotalInterest)} 
          subValue={statsLockedInterest > 0 ? `Đã chốt: ${formatCurrency(statsLockedInterest)}` : `Lãi suất: ${interestRate}%`}
          icon={PiggyBank} 
          colorClass="bg-rose-600 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '550px', height: '550px' }}>
        <GlassCard className="lg:col-span-2 flex flex-col p-6 border-slate-200" style={{ height: '100%', minHeight: '550px' }}>
          <div className="flex justify-between items-center mb-6" style={{ flexShrink: 0 }}>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Tiến độ & Phân bổ vốn</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">
                {isDetailedView 
                  ? `Chi tiết ${selectedProjectIds.length} dự án được chọn` 
                  : "Tổng quan toàn bộ hệ thống"}
              </p>
            </div>
            {isDetailedView && (
              <button 
                onClick={() => setSelectedProjectIds([])}
                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-red-200"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
          <div 
            ref={chartContainerRef}
            className="flex-1 w-full" 
            style={{ 
              height: '450px', 
              width: '100%', 
              position: 'relative', 
              flexShrink: 0,
              minHeight: '400px',
              minWidth: '300px'
            }}
          >
            {chartDimensions.width > 0 && chartDimensions.height > 0 ? (
              <ResponsiveContainer width={chartDimensions.width} height={chartDimensions.height}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
                barGap={2}
              >
                <CartesianGrid stroke="#cbd5e1" vertical={false} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="code" 
                  scale="band" 
                  tick={{fontSize: 11, fontWeight: 500, fill: '#0f172a'}} 
                  interval={0} 
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value)} 
                  tick={{fontSize: 11, fontWeight: 500, fill: '#475569'}}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Vốn (VND)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 10, fontWeight: 600 } }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  unit="%" 
                  tick={{fontSize: 11, fontWeight: 500, fill: '#2563eb'}}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: '% Hoàn thành', angle: 90, position: 'insideRight', style: { fill: '#2563eb', fontSize: 10, fontWeight: 600 } }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.04)'}} />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '16px', color: '#334155' }}
                />
                
                <Bar 
                  yAxisId="left" 
                  dataKey="totalBudget" 
                  name="Tổng vốn" 
                  fill="#3b82f6" 
                  radius={[3, 3, 0, 0]} 
                  barSize={isDetailedView ? undefined : 24}
                />

                {isDetailedView && (
                  <>
                    <Bar 
                      yAxisId="left" 
                      dataKey="disbursedAmount" 
                      name="Đã giải ngân" 
                      fill="#10b981" 
                      radius={[3, 3, 0, 0]} 
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="pendingAmount" 
                      name="Chưa giải ngân" 
                      fill="#f59e0b" 
                      radius={[3, 3, 0, 0]} 
                    />
                     <Bar 
                      yAxisId="left" 
                      dataKey="interestAmount" 
                      name="Lãi phát sinh (Hold)" 
                      fill="#f43f5e" 
                      radius={[3, 3, 0, 0]} 
                    />
                  </>
                )}
                
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="completionRate" 
                  name="% Tỷ lệ hoàn thành" 
                  unit="%"
                  stroke="#2563eb" 
                  strokeWidth={2.5} 
                  dot={{r: 4, strokeWidth: 1.5, fill: '#fff', stroke: '#2563eb'}} 
                  activeDot={{r: 6, strokeWidth: 0}} 
                />
              </ComposedChart>
            </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-slate-500">Đang tải biểu đồ...</p>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col overflow-hidden p-0 border-slate-200">
           <div className="p-5 border-b border-slate-200 bg-white/50 flex justify-between items-center backdrop-blur-md">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Dự án</h3>
             <button 
                onClick={() => setActiveTab('projects')}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full"
              >
               Tất cả <ChevronRight size={12}/>
             </button>
           </div>
           
           <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
             <table className="w-full text-left border-collapse">
               <thead className="text-[10px] text-slate-500 font-bold uppercase sticky top-0 bg-white/95 backdrop-blur-md z-10 shadow-sm border-b border-slate-200">
                 <tr>
                   <th className="p-3 w-8 text-center">#</th>
                   <th className="p-3">Dự án</th>
                   <th className="p-3 text-right">Giá trị dự án</th>
                   <th className="p-3 w-14 text-center">%</th>
                 </tr>
               </thead>
               <tbody className="text-sm divide-y divide-slate-200">
                 {projectStats.map((project, index) => (
                   <tr 
                      key={project.id} 
                      className={`
                        group transition-all cursor-pointer rounded-lg
                        ${selectedProjectIds.includes(project.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}
                      `}
                      onClick={() => toggleProjectSelection(project.id)}
                   >
                     <td className="p-3 text-center">
                       <div className={`
                         w-4 h-4 rounded border flex items-center justify-center transition-all mx-auto
                         ${selectedProjectIds.includes(project.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white group-hover:border-blue-400'}
                       `}>
                         {selectedProjectIds.includes(project.id) && <Check size={10} className="text-white" strokeWidth={3} />}
                       </div>
                     </td>
                     <td className="p-3">
                       <p className={`font-semibold text-[13px] text-black truncate max-w-[120px] ${selectedProjectIds.includes(project.id) ? 'text-blue-800' : ''}`} title={project.name}>{project.name}</p>
                       <p className="text-[10px] font-medium text-slate-500 truncate">{project.code}</p>
                     </td>
                     <td className="p-3 text-right font-medium text-[12px] text-black">
                       {formatCurrency(project.totalBudget)}
                     </td>
                     <td className="p-3 text-center">
                       <span className={`text-[11px] font-bold ${project.completionRate === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                         {project.completionRate}%
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
           
           <div className="p-3 bg-white/80 border-t border-slate-200 text-[10px] font-medium text-slate-600 text-center backdrop-blur-sm">
             Đã chọn <span className="font-bold text-blue-700">{selectedProjectIds.length}</span> dự án
           </div>
        </GlassCard>
      </div>
    </div>
  );
};
