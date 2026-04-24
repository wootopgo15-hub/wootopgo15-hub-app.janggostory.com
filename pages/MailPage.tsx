import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData, submitToGoogleSheets } from '../services/googleSheets';

interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  type: 'inbox' | 'sent';
  attachments?: { name: string; size: number }[];
}

const BRANCH_EMAILS = [
  { name: '본사(관리자)', email: 'wootopgo15@gmail.com' },
  { name: '천안지사', email: 'cheonan@janggostory.com' },
  { name: '세종지사', email: 'sejong@janggostory.com' },
  { name: '평택지사', email: 'pyeongtaek@janggostory.com' }
];

const MailPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUserEmail, setCurrentUserEmail] = useState('wootopgo15@gmail.com');
  const [currentUserBranch, setCurrentUserBranch] = useState('');
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [viewState, setViewState] = useState<'list' | 'read' | 'compose'>('list');
  const [selectedMail, setSelectedMail] = useState<Email | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);

  // Compose State
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const [showWelcomeInfo, setShowWelcomeInfo] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    let userEmailForMail = 'wootopgo15@gmail.com';
    let userBranchForMail = '';

    if (userData) {
      const parsed = JSON.parse(userData);
      
      if (parsed.branch) {
        userBranchForMail = parsed.branch;
        setCurrentUserBranch(parsed.branch);
        
        // Try to match branch to our predefined list
        const matchingBranch = BRANCH_EMAILS.find(b => 
          b.name === parsed.branch || b.name === `${parsed.branch}지사` || parsed.branch === `${b.name}지사` || parsed.branch.includes(b.name.replace('지사', ''))
        );
        
        if (matchingBranch) {
          userEmailForMail = matchingBranch.email;
        } else if (parsed.email) {
          userEmailForMail = parsed.email;
        }
      } else if (parsed.email) {
        userEmailForMail = parsed.email;
      }
      
      setCurrentUserEmail(userEmailForMail);
    }
    
    // Load emails from Google Sheets
    const loadMails = async () => {
      try {
        const sheetMails = await fetchSheetData('MAIL');
        if (sheetMails && sheetMails.length > 0) {
          const parsedMails: Email[] = sheetMails.map((m: any) => ({
            id: m.id || m.ID || Date.now().toString() + Math.random(),
            from: m.from || m['발신자'] || '',
            to: m.to || m['수신자'] || '',
            subject: m.subject || m['제목'] || '',
            body: m.body || m['내용'] || '',
            date: m.date || m['날짜'] || new Date().toISOString(),
            read: m.read === true || m.read === 'true' || m['읽음'] === true || m['읽음'] === 'true',
            type: 'inbox' // We compute inbox/sent dynamically based on user
          }));
          setEmails(parsedMails);
        } else {
          // Empty or fail -> load mostly local fallback just in case
          const savedEmails = localStorage.getItem('janggo_emails');
          if (savedEmails) {
            setEmails(JSON.parse(savedEmails));
          }
        }
      } catch (error) {
        console.error('Failed to load mails from sheets:', error);
        const savedEmails = localStorage.getItem('janggo_emails');
        if (savedEmails) {
          setEmails(JSON.parse(savedEmails));
        }
      }
    };

    loadMails();
  }, []);

  const saveEmails = (newEmails: Email[]) => {
    setEmails(newEmails);
    localStorage.setItem('janggo_emails', JSON.stringify(newEmails));
  };

  const handleReadMail = (mail: Email) => {
    setSelectedMail(mail);
    setViewState('read');
    if (!mail.read) {
      const updated = emails.map(e => e.id === mail.id ? { ...e, read: true } : e);
      saveEmails(updated);
      
      // Attempt to update read status in standard sheets
      submitToGoogleSheets({
        type: 'MAIL',
        mode: 'UPDATE_MAIL',
        id: mail.id,
        read: 'true'
      }).catch(err => {
         console.error('Failed to mark read on sheets', err);
      });
    }
  };

  const handleSendMail = async () => {
    if (!composeTo || !composeSubject.trim() || !composeBody.trim()) {
      alert('메일 수신자, 제목 및 내용을 모두 입력해주세요.');
      return;
    }

    setIsSending(true);

    const newMail: Email = {
      id: Date.now().toString(),
      from: currentUserEmail,
      to: composeTo,
      subject: composeSubject,
      body: composeBody,
      date: new Date().toISOString(),
      read: true,
      type: 'sent',
      attachments: composeAttachments.map(f => ({ name: f.name, size: f.size }))
    };

    try {
      await submitToGoogleSheets({
        mode: 'SEND_MAIL',
        type: 'MAIL',
        id: newMail.id,
        from: newMail.from,
        to: newMail.to,
        subject: newMail.subject,
        body: newMail.body,
        date: newMail.date,
        read: 'false' // Initial unread state for recipient
      });
    } catch (e) {
      console.error('Failed to send mail via Google Sheets:', e);
      // Ignore GAS error locally, proceed with local saving
    }

    // Save locally
    const updated = [newMail, ...emails];
    saveEmails(updated);

    setIsSending(false);
    setComposeSubject('');
    setComposeBody('');
    setComposeTo('');
    setComposeAttachments([]);
    setViewState('list');
    setActiveTab('sent');
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const currentList = emails.filter(e => activeTab === 'inbox' ? e.to === currentUserEmail : e.from === currentUserEmail).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 text-[#0a1931] font-sans">
      {/* Header */}
      <header className="px-4 py-3 shrink-0 flex items-center justify-between border-b border-gray-100 safe-top text-white bg-indigo-600 shadow-sm relative z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (viewState !== 'list') setViewState('list');
            else navigate('/home');
          }} className="flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight">업무 메일</h1>
            <span className="text-sm font-medium text-indigo-50 mt-0.5">{currentUserEmail}</span>
          </div>
        </div>
        {viewState === 'list' && (
          <button onClick={() => setViewState('compose')} className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">edit_square</span>
            <span className="text-[10px] font-medium leading-none mt-1">작성</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      {viewState === 'list' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tabs */}
          <div className="flex px-4 py-2 bg-white border-b border-gray-100 shrink-0 gap-2">
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'inbox' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('inbox')}
            >
              <span className="material-symbols-outlined text-[18px]">inbox</span>
              받은 메일함
              {emails.filter(e => e.to === currentUserEmail && !e.read).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full leading-none">
                  {emails.filter(e => e.to === currentUserEmail && !e.read).length}
                </span>
              )}
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'sent' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('sent')}
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              보낸 메일함
            </button>
          </div>

          {/* Mail List */}
          <div className="flex-1 overflow-y-auto bg-white relative">
            {currentUserBranch && BRANCH_EMAILS.find(b => b.name === currentUserBranch || b.name === `${currentUserBranch}지사` || currentUserBranch === `${b.name}지사`) && showWelcomeInfo && (
              <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-6 backdrop-blur-sm">
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="bg-indigo-600 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 pointer-events-none">
                      <span className="material-symbols-outlined text-[120px]">mail</span>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 relative z-10">
                      <span className="material-symbols-outlined text-white text-3xl">mark_email_unread</span>
                    </div>
                    <h3 className="text-xl font-bold text-white relative z-10">환영합니다.</h3>
                    <h2 className="text-2xl font-black text-white relative z-10 mt-1">
                      {currentUserBranch.endsWith('지사') ? currentUserBranch : `${currentUserBranch}지사`}장님
                    </h2>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-[15px] text-gray-700 leading-relaxed overflow-hidden">
                      {currentUserBranch.endsWith('지사') ? currentUserBranch : `${currentUserBranch}지사`}장님의 발신용 메일은 <br />
                      <span className="inline-block mt-3 px-4 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl break-all w-full text-lg leading-tight shadow-inner">
                        {BRANCH_EMAILS.find(b => b.name === currentUserBranch || b.name === `${currentUserBranch}지사` || currentUserBranch === `${b.name}지사`)?.email}
                      </span>
                    </p>
                    <p className="text-[13px] text-gray-500 mt-4 leading-relaxed">
                      앞으로 해당 메일을 통해<br />업무를 진행해주시기 바랍니다.
                    </p>
                    <button 
                      onClick={() => setShowWelcomeInfo(false)}
                      className="w-full mt-6 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm shadow-indigo-500/20"
                    >
                      확인했습니다
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {currentList.length === 0 ? (
              <div className="h-[70%] flex flex-col items-center justify-center text-gray-400 gap-3">
                <span className="material-symbols-outlined text-5xl opacity-20">mail</span>
                <p className="text-sm">메일이 없습니다.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 mt-2">
                {currentList.map(mail => {
                  const isInbox = activeTab === 'inbox';
                  return (
                  <li 
                    key={mail.id} 
                    onClick={() => handleReadMail(mail)}
                    className={`p-4 hover:bg-indigo-50/30 cursor-pointer transition-colors ${!mail.read && isInbox ? 'bg-indigo-50/10' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        {isInbox && !mail.read && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>}
                        <h3 className={`text-sm truncate ${!mail.read && isInbox ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {isInbox ? mail.from : `선택: ${mail.to}`}
                        </h3>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{formatDate(mail.date)}</span>
                    </div>
                    <h4 className={`text-[15px] truncate mb-1 ${isInbox && !mail.read ? 'pl-4 font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {mail.subject}
                    </h4>
                    <p className={`text-[13px] text-gray-500 line-clamp-1 ${isInbox && !mail.read ? 'pl-4' : ''}`}>
                      {mail.body}
                    </p>
                  </li>
                )})}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Read View */}
      {viewState === 'read' && selectedMail && (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="p-5 border-b border-gray-100 shrink-0">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedMail.subject}</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {(activeTab === 'inbox' ? selectedMail.from : selectedMail.to).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">
                    {activeTab === 'inbox' ? selectedMail.from : `수신: ${selectedMail.to}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(selectedMail.date).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 flex-1 overflow-y-auto w-full max-w-full">
            <div className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
              {selectedMail.body}
            </div>
            {selectedMail.attachments && selectedMail.attachments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">attach_file</span>
                  첨부파일 ({selectedMail.attachments.length})
                </h4>
                <div className="flex flex-col gap-2">
                  {selectedMail.attachments.map((att, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 shrink-0">
                          <span className="material-symbols-outlined text-gray-500 text-[18px]">insert_drive_file</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-gray-800 truncate">{att.name}</span>
                          <span className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                      <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0">
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {activeTab === 'inbox' && (
            <div className="p-4 border-t border-gray-100 shrink-0 bg-gray-50">
              <button 
                onClick={() => {
                  setComposeTo(selectedMail.from);
                  setComposeSubject(`RE: ${selectedMail.subject}`);
                  setComposeBody(`\n\n--- 원본 메일 ---\n${selectedMail.body}`);
                  setViewState('compose');
                }}
                className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">reply</span>
                답장하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* Compose View */}
      {viewState === 'compose' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
          <div className="flex flex-col shrink-0">
            <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <span className="text-sm font-bold text-gray-500 w-16 shrink-0">받는사람</span>
              <input 
                type="email"
                list="branch-emails"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="이메일 주소 입력"
                className="flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:font-normal"
              />
              <datalist id="branch-emails">
                {BRANCH_EMAILS.map(branch => (
                  <option key={branch.email} value={branch.email}>{branch.name} ({branch.email})</option>
                ))}
              </datalist>
            </div>
            
            <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <span className="text-sm font-bold text-gray-500 w-16 shrink-0">제목</span>
              <input 
                type="text" 
                placeholder="제목을 입력하세요"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:font-normal"
              />
            </div>
            <div className="flex flex-col px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-500 w-16 shrink-0">첨부파일</span>
                <label className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors text-gray-700 shadow-sm">
                  <span className="material-symbols-outlined text-[18px] mr-1">attach_file</span>
                  <span className="text-[13px] font-bold">파일 추가</span>
                  <input type="file" multiple className="hidden" onChange={(e) => {
                    if (e.target.files) {
                      setComposeAttachments(prev => [...prev, ...Array.from(e.target.files as FileList)]);
                    }
                  }} />
                </label>
              </div>
              {composeAttachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {composeAttachments.map((file, idx) => (
                    <div key={idx} className="flex items-center bg-white border border-gray-200 pl-2.5 pr-1 py-1.5 rounded-lg shadow-sm">
                      <span className="material-symbols-outlined text-[16px] text-gray-400 mr-1.5">insert_drive_file</span>
                      <span className="text-[13px] text-gray-700 max-w-[150px] truncate font-medium">{file.name}</span>
                      <button onClick={() => setComposeAttachments(prev => prev.filter((_, i) => i !== idx))} className="ml-1 p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-rose-500 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <textarea 
            placeholder="메일 내용을 작성해주세요..."
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
            className="flex-1 p-5 text-[15px] leading-relaxed text-gray-800 resize-none outline-none custom-scrollbar placeholder:text-gray-300"
          />

          <div className="p-4 border-t border-gray-100 shrink-0 bg-white">
            <button 
              onClick={handleSendMail}
              disabled={isSending}
              className={`w-full text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20 transition-all ${
                isSending ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
              }`}
            >
              {isSending ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                  전송 중...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  보내기
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MailPage; 

