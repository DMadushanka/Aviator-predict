import React, { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, Search, ChevronLeft, ChevronRight, HelpCircle, TableProperties } from 'lucide-react';
import { MultiplierRecord } from '../types';

interface MultipliersExcelTableProps {
  multipliers: MultiplierRecord[];
}

export default function MultipliersExcelTable({ multipliers }: MultipliersExcelTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // We sort oldest-to-newest for run-history calculations, then display newest-first
  const chronologically = useMemo(() => {
    return [...multipliers].reverse(); // Oldest to newest
  }, [multipliers]);

  // Compute 15 columns of data for each multiplier row
  const computedRows = useMemo(() => {
    const rows = [];
    let runningSum = 0;
    let last10xIndex = -1;

    for (let i = 0; i < chronologically.length; i++) {
      const record = chronologically[i];
      const val = record.multiplier;
      runningSum += val;

      // 1. No.
      const seqNo = i + 1;

      // 2. Multiplier Value (raw number)
      
      // 3. Multiplier Category
      let category = 'LOW';
      let colorClass = 'text-amber-400 bg-amber-950/20 border-amber-900/40';
      let excelColor = '#fbbf24'; // For excel download hint
      if (val < 1.50) {
        category = 'CRASH';
        colorClass = 'text-rose-400 bg-rose-950/20 border-rose-900/40';
        excelColor = '#f87171';
      } else if (val < 2.00) {
        category = 'LOW';
        colorClass = 'text-orange-400 bg-orange-950/20 border-orange-900/40';
        excelColor = '#fb923c';
      } else if (val < 10.00) {
        category = 'MEDIUM';
        colorClass = 'text-violet-400 bg-violet-950/20 border-violet-900/40';
        excelColor = '#c084fc';
      } else {
        category = 'HIGH FLYER';
        colorClass = 'text-emerald-300 bg-emerald-950/30 border-emerald-500/30 font-bold';
        excelColor = '#34d399';
      }

      // 4 & 5. Date & Time
      const d = new Date(record.timestamp);
      const dateStr = d.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

      // 6. UTC Timestamp
      const utcTimestamp = record.timestamp;

      // 7. Input Source
      const source = record.source.toUpperCase();

      // 8 & 9. Previous Multiplier & Trend Direction
      const prevVal = i > 0 ? chronologically[i - 1].multiplier : null;
      let trend = '➡️ STABLE';
      if (prevVal !== null) {
        if (val > prevVal) trend = '📈 UP';
        else if (val < prevVal) trend = '📉 DOWN';
      }

      // 10. Running 5-Round Mean up to this point
      const last5 = chronologically.slice(Math.max(0, i - 4), i + 1);
      const runningMean5 = last5.reduce((sum, r) => sum + r.multiplier, 0) / last5.length;

      // 11. Rounds Since Last 10x+ High Flyer
      if (val >= 10.0) {
        last10xIndex = i;
      }
      const roundsSince10x = last10xIndex !== -1 ? i - last10xIndex : i;

      // 12. Security Verification
      const securityStatus = record.source === 'scraper' ? 'VERIFIED_API' : 'LOCAL_LOG';

      // 13. Risk Assessment Profile
      let riskProfile = 'MODERATE';
      if (val < 1.30) riskProfile = 'HIGH_LOSS';
      else if (val >= 10.0) riskProfile = 'EXTREME_GAIN';
      else if (val >= 2.0) riskProfile = 'FAVORABLE';

      // 14. Auto-Cashout Suggestion
      // Simple adaptive suggestor: if recent series has high mean, suggest higher, else suggest defensive
      let suggestedAutoCashout = 1.35;
      if (runningMean5 < 1.8) {
        suggestedAutoCashout = 1.15; // defensive
      } else if (runningMean5 > 4.0) {
        suggestedAutoCashout = 2.00; // aggressive
      } else {
        suggestedAutoCashout = 1.50; // medium
      }

      // 15. Short ID Hash
      const shortId = record.id.slice(0, 8);

      rows.push({
        id: record.id,
        no: seqNo,                                // Column 1
        multiplier: val,                          // Column 2
        category,                                 // Column 3
        date: dateStr,                            // Column 4
        time: timeStr,                            // Column 5
        timestamp: utcTimestamp,                  // Column 6
        source,                                   // Column 7
        prevMultiplier: prevVal !== null ? `${prevVal.toFixed(2)}x` : 'N/A', // Column 8
        trend,                                    // Column 9
        runningMean: parseFloat(runningMean5.toFixed(2)), // Column 10
        roundsSince10x,                           // Column 11
        securityStatus,                           // Column 12
        riskProfile,                              // Column 13
        suggestedAutoCashout,                     // Column 14
        shortId,                                  // Column 15
        colorClass,
        excelColor
      });
    }

    // Return in reverse order (newest first) for visual display
    return rows.reverse();
  }, [chronologically]);

  // Apply Search Filtering across the 15 columns
  const filteredRows = useMemo(() => {
    if (!searchTerm) return computedRows;
    const lower = searchTerm.toLowerCase();
    return computedRows.filter(row => {
      return (
        row.no.toString().includes(lower) ||
        row.multiplier.toFixed(2).includes(lower) ||
        row.category.toLowerCase().includes(lower) ||
        row.date.toLowerCase().includes(lower) ||
        row.time.toLowerCase().includes(lower) ||
        row.timestamp.toString().includes(lower) ||
        row.source.toLowerCase().includes(lower) ||
        row.trend.toLowerCase().includes(lower) ||
        row.runningMean.toFixed(2).includes(lower) ||
        row.roundsSince10x.toString().includes(lower) ||
        row.securityStatus.toLowerCase().includes(lower) ||
        row.riskProfile.toLowerCase().includes(lower) ||
        row.suggestedAutoCashout.toFixed(2).includes(lower) ||
        row.shortId.toLowerCase().includes(lower)
      );
    });
  }, [computedRows, searchTerm]);

  // Pagination logic
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // HTML-based Excel Download Handler with integrated colors and styles
  const downloadExcelSheet = () => {
    if (computedRows.length === 0) return;

    // Define the 15 headers
    const headers = [
      "No.",
      "Multiplier Value",
      "Multiplier Category",
      "Generated Date",
      "Generated Time",
      "UTC Millisecond Timestamp",
      "Input Source",
      "Previous Multiplier",
      "Trend Direction",
      "Running 5-Round Mean",
      "Rounds Since Last 10x+",
      "Security Verification",
      "Risk Assessment Profile",
      "Auto-Cashout Suggestion",
      "System ID Hash"
    ];

    // Build styled HTML table rows
    const htmlRows = computedRows.map(row => {
      // Inline styles for high-fidelity color presentation in Microsoft Excel & Google Sheets
      const isCrash = row.multiplier < 1.50;
      const isLow = row.multiplier >= 1.50 && row.multiplier < 2.00;
      const isMedium = row.multiplier >= 2.00 && row.multiplier < 10.00;
      const isHigh = row.multiplier >= 10.00;

      let catBg = "#fef2f2";
      let catText = "#dc2626";
      if (isLow) {
        catBg = "#fff7ed";
        catText = "#ea580c";
      } else if (isMedium) {
        catBg = "#faf5ff";
        catText = "#7c3aed";
      } else if (isHigh) {
        catBg = "#ecfdf5";
        catText = "#059669";
      }

      const trendColor = row.trend.includes('UP') ? '#10b981' : row.trend.includes('DOWN') ? '#ef4444' : '#64748b';
      const riskColor = row.riskProfile === 'EXTREME_GAIN' ? '#059669' : row.riskProfile === 'FAVORABLE' ? '#7c3aed' : row.riskProfile === 'MODERATE' ? '#d97706' : '#dc2626';

      return `
        <tr>
          <td style="text-align: center; font-weight: bold; background-color: #f8fafc; border: 1px solid #cbd5e1; color: #64748b;">${row.no}</td>
          <td style="font-weight: bold; color: ${row.excelColor}; border: 1px solid #cbd5e1; font-size: 11pt;">${row.multiplier.toFixed(2)}x</td>
          <td style="background-color: ${catBg}; color: ${catText}; font-weight: bold; text-align: center; border: 1px solid #cbd5e1;">${row.category}</td>
          <td style="border: 1px solid #cbd5e1; color: #334155;">${row.date}</td>
          <td style="color: #059669; font-weight: bold; border: 1px solid #cbd5e1;">${row.time}</td>
          <td style="color: #64748b; font-size: 9pt; border: 1px solid #cbd5e1;">${row.timestamp}</td>
          <td style="text-align: center; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; font-size: 9pt;">${row.source}</td>
          <td style="border: 1px solid #cbd5e1; color: #475569;">${row.prevMultiplier}</td>
          <td style="color: ${trendColor}; font-weight: bold; border: 1px solid #cbd5e1;">${row.trend}</td>
          <td style="color: #8b5cf6; font-weight: bold; border: 1px solid #cbd5e1;">${row.runningMean.toFixed(2)}x</td>
          <td style="text-align: center; color: #4f46e5; font-weight: bold; background-color: #f5f3ff; border: 1px solid #cbd5e1;">${row.roundsSince10x}</td>
          <td style="border: 1px solid #cbd5e1; color: #64748b; font-size: 9pt;">${row.securityStatus}</td>
          <td style="color: ${riskColor}; font-weight: bold; border: 1px solid #cbd5e1;">${row.riskProfile}</td>
          <td style="color: #059669; font-weight: bold; background-color: #f0fdf4; border: 1px solid #cbd5e1;">${row.suggestedAutoCashout.toFixed(2)}x</td>
          <td style="color: #94a3b8; font-size: 9pt; border: 1px solid #cbd5e1; text-align: right;">${row.shortId}</td>
        </tr>
      `;
    }).join("");

    // Create Excel XML Template with Gridlines, styling sheet, and worksheet definitions
    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <!--[if gte mso 9]>
      <xml>
       <x:ExcelWorkbook>
        <x:ExcelWorksheets>
         <x:ExcelWorksheet>
          <x:Name>Flight Multiplier Dataset</x:Name>
          <x:WorksheetOptions>
           <x:DisplayGridlines/>
          </x:WorksheetOptions>
         </x:ExcelWorksheet>
        </x:ExcelWorksheets>
       </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; }
        th { background-color: #0f172a; color: #ffffff; font-weight: bold; font-family: sans-serif; font-size: 10pt; text-align: left; border: 1px solid #475569; padding: 10px; }
        td { font-family: sans-serif; font-size: 10pt; padding: 8px; border: 1px solid #cbd5e1; }
      </style>
      </head>
      <body>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th style="background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px;">${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${htmlRows}
        </tbody>
      </table>
      </body>
      </html>
    `;

    // Package the HTML into a blob with Excel MIME Type
    const blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `multiplier_history_color_coded_report_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div id="multipliers-excel-sheet-panel" className="glass-card rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-72 h-36 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header and Download Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              15-Column Multiplier Spreadsheet
              <span className="text-[9px] bg-emerald-950/80 border border-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider">
                Excel Compatible
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">Full flight history spreadsheet with comprehensive mathematical metadata calculations</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          id="btn-download-excel-spreadsheet"
          disabled={multipliers.length === 0}
          onClick={downloadExcelSheet}
          className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download size={14} />
          Export to Excel (.CSV)
        </button>
      </div>

      {multipliers.length === 0 ? (
        <div className="py-12 text-center bg-[#080b16]/30 rounded-xl border border-white/5">
          <TableProperties className="text-slate-600 mx-auto opacity-30 mb-2" size={36} />
          <p className="text-xs text-slate-400">Spreadsheet dataset is empty. Scraping some multipliers will automatically populate these calculations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Search bar inside spreadsheet */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-600" size={14} />
            <input
              id="inp-spreadsheet-search"
              type="text"
              placeholder="Search across all 15 columns..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // reset to page 1
              }}
              className="w-full glass-input rounded-lg pl-9 pr-3 py-1.5 text-xs placeholder-slate-600"
            />
          </div>

          {/* Large Multi-Column Table Wrapper */}
          <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/25">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-[#080b16] border-b border-white/5 text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">
                  <th className="py-3 px-4 text-center w-12">No.</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time (Gen)</th>
                  <th className="py-3 px-4">UTC Timestamp</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Prev Val</th>
                  <th className="py-3 px-4">Trend</th>
                  <th className="py-3 px-4">5-Round Mean</th>
                  <th className="py-3 px-4">Rounds Since 10x</th>
                  <th className="py-3 px-4">Security</th>
                  <th className="py-3 px-4">Risk Profile</th>
                  <th className="py-3 px-4">Suggested Exit</th>
                  <th className="py-3 px-4 text-right">ID Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-mono">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-8 text-center text-slate-500 italic">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-white/2 transition-colors">
                      {/* 1. No. */}
                      <td className="py-3 px-4 text-center text-slate-500 font-bold border-r border-white/2">
                        {row.no}
                      </td>
                      
                      {/* 2. Value - Separately color coded */}
                      <td className="py-3 px-4 font-black text-sm">
                        <span 
                          style={{ color: row.excelColor }} 
                          className={row.multiplier >= 10 ? 'neon-red-text' : ''}
                        >
                          {row.multiplier.toFixed(2)}x
                        </span>
                      </td>

                      {/* 3. Category - separately styled badge */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] border ${row.colorClass}`}>
                          {row.category}
                        </span>
                      </td>

                      {/* 4. Date */}
                      <td className="py-3 px-4 text-slate-300">
                        {row.date}
                      </td>

                      {/* 5. Time */}
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        {row.time}
                      </td>

                      {/* 6. UTC Timestamp */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {row.timestamp}
                      </td>

                      {/* 7. Source */}
                      <td className="py-3 px-4">
                        <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                          {row.source}
                        </span>
                      </td>

                      {/* 8. Prev Val */}
                      <td className="py-3 px-4 text-slate-400">
                        {row.prevMultiplier}
                      </td>

                      {/* 9. Trend */}
                      <td className="py-3 px-4 text-[11px]">
                        <span className={row.trend.includes('UP') ? 'text-emerald-400' : row.trend.includes('DOWN') ? 'text-rose-400' : 'text-slate-500'}>
                          {row.trend}
                        </span>
                      </td>

                      {/* 10. Running Mean */}
                      <td className="py-3 px-4 text-violet-400">
                        {row.runningMean.toFixed(2)}x
                      </td>

                      {/* 11. Rounds Since 10x */}
                      <td className="py-3 px-4 text-indigo-400 font-bold text-center">
                        {row.roundsSince10x}
                      </td>

                      {/* 12. Security */}
                      <td className="py-3 px-4 text-[10px] text-slate-400">
                        {row.securityStatus}
                      </td>

                      {/* 13. Risk Profile */}
                      <td className="py-3 px-4 text-[10px]">
                        <span className={
                          row.riskProfile === 'EXTREME_GAIN' ? 'text-emerald-300 font-bold' :
                          row.riskProfile === 'FAVORABLE' ? 'text-violet-300' :
                          row.riskProfile === 'MODERATE' ? 'text-amber-300' : 'text-rose-300'
                        }>
                          {row.riskProfile}
                        </span>
                      </td>

                      {/* 14. Auto-Cashout Suggestion */}
                      <td className="py-3 px-4 text-emerald-300 font-bold">
                        {row.suggestedAutoCashout.toFixed(2)}x
                      </td>

                      {/* 15. ID Hash */}
                      <td className="py-3 px-4 text-right text-slate-600 text-[10px]">
                        {row.shortId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between bg-[#05070e] py-3 px-4 border border-white/5 rounded-xl text-xs font-mono text-slate-500">
            <div>
              Showing <span className="text-slate-300">{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-300">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-slate-300 font-bold">{totalItems}</span> computed records
            </div>
            
            <div className="flex items-center gap-2">
              <button
                id="btn-spreadsheet-prev-page"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-[#0c101e] border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              
              <span className="text-slate-400">
                Page <span className="text-slate-200 font-bold">{currentPage}</span> of {totalPages || 1}
              </span>

              <button
                id="btn-spreadsheet-next-page"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg bg-[#0c101e] border border-white/5 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
