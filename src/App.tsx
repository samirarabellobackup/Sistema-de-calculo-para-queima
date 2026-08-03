import React, { useState, useEffect, useMemo } from 'react';
import { 
  Flame, 
  Trash2, 
  Plus, 
  Copy, 
  FileText, 
  Share2, 
  Mail, 
  Settings, 
  Bell, 
  User, 
  LogOut, 
  LogIn, 
  CheckCircle, 
  Check, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Users,
  TrendingUp,
  Clock,
  Send,
  PlusCircle,
  HelpCircle,
  Upload,
  FileUp,
  X,
  Pencil
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReChartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { FiringType, BiscoitoMethod, PieceItem, Order, User as UserType, NotificationItem } from './types';
import { KilnOptimizer, packPiecesOnShelves } from './components/KilnOptimizer';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'orcamento' | 'historico' | 'admin'>('orcamento');
  
  // Auth states
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authNome, setAuthNome] = useState('');
  const [authError, setAuthError] = useState('');

  // Piece Builder form states
  const [pecaNome, setPecaNome] = useState('Prato Decorativo');
  const [tipoQueima, setTipoQueima] = useState<'biscoito' | 'esmalte' | 'monoqueima' | 'terceira_queima' | 'ambas'>('biscoito');
  const [metodoQueima, setMetodoQueima] = useState<string>('ajuste_inteligente');
  const [metodoQueimaEsmalte, setMetodoQueimaEsmalte] = useState<string>('ajuste_inteligente');
  const [altura, setAltura] = useState<number>(8);
  const [largura, setLargura] = useState<number>(15);
  const [profundidade, setProfundidade] = useState<number>(15);
  
  // Technical details for current peca being configured (Optional)
  const [incluirDetalhes, setIncluirDetalhes] = useState<boolean>(false);
  const [nacionalidadeMassa, setNacionalidadeMassa] = useState<string>('Nacional');
  const [marcaMassa, setMarcaMassa] = useState<string>('');
  const [tempMaximaQueima, setTempMaximaQueima] = useState<number>(1250);
  const [tipoEsmalte, setTipoEsmalte] = useState<'reagente' | 'estavel' | 'mate' | 'acetinado' | 'brilho' | ''>('estavel');
  const [marcaEsmalte, setMarcaEsmalte] = useState<string>('');
  const [tempMaximaEsmalte, setTempMaximaEsmalte] = useState<number>(1240);
  const [quantasCamadas, setQuantasCamadas] = useState<number>(2);

  // Set of pieces added to current quote
  const [piecesList, setPiecesList] = useState<PieceItem[]>([]);
  
  // App alerts / state
  const [podeSobreporBiscoito, setPodeSobreporBiscoito] = useState<boolean>(true);
  const [aceitouDanosEsmalte, setAceitouDanosEsmalte] = useState<boolean>(false);
  const [showTermosTecnicos, setShowTermosTecnicos] = useState<boolean>(false);
  const [showNotificationTray, setShowNotificationTray] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [savingOrder, setSavingOrder] = useState<boolean>(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  // Gemini AI Analysis states
  const [isAnalyzingTech, setIsAnalyzingTech] = useState<boolean>(false);
  const [geminiRelatorio, setGeminiRelatorio] = useState<{
    relatorioGeral: string;
    analises: Array<{
      pecaId: string;
      nome: string;
      resultado: string;
      avaliacao: string;
      riscos: string;
      conselhoTecnico: string;
      statusCompatibilidade: string;
    }>;
  } | null>(null);

  // Admin filter & actions state
  const [adminFilterStatus, setAdminFilterStatus] = useState<string>('todos');

  // Import states (PDF & Text/Message)
  const [showImportPdfModal, setShowImportPdfModal] = useState<boolean>(false);
  const [importTab, setImportTab] = useState<'text' | 'pdf'>('text');
  const [pastedText, setPastedText] = useState<string>('');
  const [isParsingPdf, setIsParsingPdf] = useState<boolean>(false);
  const [pdfParseError, setPdfParseError] = useState<string | null>(null);
  const [pdfParseSuccessMsg, setPdfParseSuccessMsg] = useState<string | null>(null);
  const [parsedPiecesPreview, setParsedPiecesPreview] = useState<PieceItem[]>([]);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState<Set<string>>(new Set());

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedText(text);
        setPdfParseError(null);
      }
    } catch (e) {
      console.warn('Não foi possível acessar a área de transferência diretamente:', e);
      setPdfParseError('Não foi possível colar automaticamente. Use Ctrl+V para colar na caixa abaixo.');
    }
  };

  const handleProcessTextMessage = async (textToParse: string) => {
    const raw = (textToParse || pastedText || '').trim();
    if (!raw) {
      setPdfParseError('Por favor, cole a mensagem de texto do orçamento anterior.');
      return;
    }

    setIsParsingPdf(true);
    setPdfParseError(null);
    setPdfParseSuccessMsg(null);
    setParsedPiecesPreview([]);

    try {
      // 1. Try regex client-side parser first for fast matching of standard WhatsApp messages
      const regexItems: PieceItem[] = [];
      // Split text into item blocks
      const blocks = raw.split(/(?=\n\s*\*?\d+\.|\n\s*•\s*Item:|\n\s*Peça\s*\d+:)/i);

      for (let idx = 0; idx < blocks.length; idx++) {
        const b = blocks[idx];
        const dimsMatch = b.match(/(?:Medidas|Dimensões|Medida|Tamanho|AxLxP)?\s*:?\s*(\d+(?:[.,]\d+)?)\s*[xX*×]\s*(\d+(?:[.,]\d+)?)\s*[xX*×]\s*(\d+(?:[.,]\d+)?)/);
        if (dimsMatch) {
          const nameMatch = b.match(/(?:\d+\.\s*|\*\d+\.\s*|•\s*Item:\s*)([^\n*•]+)/i);
          const name = nameMatch ? nameMatch[1].trim().replace(/^\*/, '').replace(/\*$/, '').trim() : `Peça ${regexItems.length + 1}`;
          
          const alt = parseFloat(dimsMatch[1].replace(',', '.'));
          const larg = parseFloat(dimsMatch[2].replace(',', '.'));
          const prof = parseFloat(dimsMatch[3].replace(',', '.'));
          
          let tipo: FiringType = 'biscoito';
          if (/esmalte|esmalt|glaze/i.test(b)) tipo = 'esmalte';
          else if (/monoqueima|mono/i.test(b)) tipo = 'monoqueima';
          else if (/terceira/i.test(b)) tipo = 'terceira_queima';

          let metodo: BiscoitoMethod = 'compartilhada';
          if (/compartilhada/i.test(b)) metodo = 'compartilhada';
          else if (/prateleira|reserva/i.test(b)) metodo = 'reserva_prateleira';
          else if (/meia/i.test(b)) metodo = 'meia_fornada';
          else if (/fornada\s*inteira/i.test(b)) metodo = 'fornada_inteira';

          regexItems.push({
            id: 'p-txt-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 5),
            nome: name,
            tipo: tipo,
            metodo: metodo,
            altura: alt,
            largura: larg,
            profundidade: prof,
            volumeM3: (alt * larg * prof) / 1000000,
            custoCalculado: 0,
            incluirDetalhes: false
          });
        }
      }

      if (regexItems.length > 0) {
        setParsedPiecesPreview(regexItems);
        setSelectedPreviewIds(new Set(regexItems.map(p => p.id)));
        setPdfParseSuccessMsg(`Mensagem interpretada com sucesso! Encontradas ${regexItems.length} peças com dimensões.`);
        setIsParsingPdf(false);
        return;
      }

      // 2. Fallback: Call Gemini AI API to parse any formatted text
      const res = await fetch('/api/parse-text-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível interpretar o texto.');
      }

      if (data.pecas && Array.isArray(data.pecas) && data.pecas.length > 0) {
        const formattedPieces: PieceItem[] = data.pecas.map((p: any, idx: number) => {
          const alt = Number(p.altura) || 10;
          const larg = Number(p.largura) || 10;
          const prof = Number(p.profundidade) || 10;
          const vol = (alt * larg * prof) / 1000000;
          return {
            id: 'p-txt-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 5),
            nome: p.nome || `Peça ${idx + 1}`,
            tipo: p.tipo || 'biscoito',
            metodo: p.metodo || 'ajuste_inteligente',
            altura: alt,
            largura: larg,
            profundidade: prof,
            volumeM3: vol,
            custoCalculado: 0,
            detalhesTecnicos: p.detalhesTecnicos || undefined,
            incluirDetalhes: !!p.incluirDetalhes
          };
        });

        setParsedPiecesPreview(formattedPieces);
        setSelectedPreviewIds(new Set(formattedPieces.map(p => p.id)));
        setPdfParseSuccessMsg(`Análise de IA concluída com sucesso! Encontradas ${formattedPieces.length} peças no texto.`);
      } else {
        setPdfParseError('Nenhuma peça ou dimensão encontrada na mensagem colada. Verifique se o texto inclui o nome das peças e as medidas.');
      }
    } catch (err: any) {
      console.error('Erro na leitura do texto:', err);
      setPdfParseError(err.message || 'Erro ao processar a mensagem de texto.');
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleProcessPdfFile = async (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfParseError('Por favor, selecione um arquivo de pedido no formato PDF (.pdf).');
      return;
    }

    setIsParsingPdf(true);
    setPdfParseError(null);
    setPdfParseSuccessMsg(null);
    setParsedPiecesPreview([]);

    try {
      // 1. First attempt: Read PDF binary/text to extract embedded OLLARIA_ORDER_DATA_V1 metadata
      const textContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, 'ISO-8859-1');
      });

      const match = textContent.match(/OLLARIA_ORDER_DATA_V1:([A-Za-z0-9+/=]+)/);
      if (match && match[1]) {
        try {
          const jsonStr = decodeURIComponent(escape(atob(match[1])));
          const data = JSON.parse(jsonStr);
          if (data && Array.isArray(data.pieces) && data.pieces.length > 0) {
            const formattedPieces: PieceItem[] = data.pieces.map((p: any, idx: number) => {
              const alt = Number(p.altura) || 10;
              const larg = Number(p.largura) || 10;
              const prof = Number(p.profundidade) || 10;
              const vol = (alt * larg * prof) / 1000000;
              return {
                id: 'p-imp-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 5),
                nome: p.nome || `Peça ${idx + 1}`,
                tipo: p.tipo || 'biscoito',
                metodo: p.metodo || 'ajuste_inteligente',
                altura: alt,
                largura: larg,
                profundidade: prof,
                volumeM3: vol,
                custoCalculado: 0,
                detalhesTecnicos: p.detalhesTecnicos || undefined,
                incluirDetalhes: !!p.incluirDetalhes
              };
            });

            setParsedPiecesPreview(formattedPieces);
            setSelectedPreviewIds(new Set(formattedPieces.map(p => p.id)));
            setPdfParseSuccessMsg(`Verificação digital concluída! Encontradas ${formattedPieces.length} peças com especificações 100% exatas.`);
            setIsParsingPdf(false);
            return;
          }
        } catch (e) {
          console.warn('Erro ao decodificar metadados diretos do PDF:', e);
        }
      }

      // 2. Fallback: Send base64 PDF to Gemini AI endpoint
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const res = e.target?.result as string;
          const base64 = res.split(',')[1] || '';
          resolve(base64);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/parse-pdf-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64Data })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível extrair as peças do PDF.');
      }

      if (data.pecas && Array.isArray(data.pecas) && data.pecas.length > 0) {
        const formattedPieces: PieceItem[] = data.pecas.map((p: any, idx: number) => {
          const alt = Number(p.altura) || 10;
          const larg = Number(p.largura) || 10;
          const prof = Number(p.profundidade) || 10;
          const vol = (alt * larg * prof) / 1000000;
          return {
            id: 'p-imp-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 5),
            nome: p.nome || `Peça ${idx + 1}`,
            tipo: p.tipo || 'biscoito',
            metodo: p.metodo || 'ajuste_inteligente',
            altura: alt,
            largura: larg,
            profundidade: prof,
            volumeM3: vol,
            custoCalculado: 0,
            detalhesTecnicos: p.detalhesTecnicos || undefined,
            incluirDetalhes: !!p.incluirDetalhes
          };
        });

        setParsedPiecesPreview(formattedPieces);
        setSelectedPreviewIds(new Set(formattedPieces.map(p => p.id)));
        setPdfParseSuccessMsg(`Extração de IA concluída com sucesso! Encontradas ${formattedPieces.length} peças no documento PDF.`);
      } else {
        setPdfParseError('Nenhuma peça identificada neste PDF. Verifique se o arquivo corresponde a um pedido de queima anterior.');
      }
    } catch (err: any) {
      console.error('Erro na leitura do PDF:', err);
      setPdfParseError(err.message || 'Erro ao processar o arquivo PDF. Tente outro documento.');
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleConfirmImport = (mode: 'replace' | 'append') => {
    const piecesToImport = parsedPiecesPreview.filter(p => selectedPreviewIds.has(p.id));
    if (piecesToImport.length === 0) {
      setPdfParseError('Selecione pelo menos uma peça para importar.');
      return;
    }

    if (mode === 'replace') {
      setPiecesList(piecesToImport);
    } else {
      setPiecesList(prev => [...prev, ...piecesToImport]);
    }

    setShowImportPdfModal(false);
    setParsedPiecesPreview([]);
    setPdfParseSuccessMsg(null);
    setPdfParseError(null);
  };

  const toggleSelectPreviewPiece = (id: string) => {
    const newSet = new Set(selectedPreviewIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedPreviewIds(newSet);
  };

  // Load user from localstorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('atelie_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch orders and notifications when user is set
  useEffect(() => {
    if (currentUser) {
      fetchUserOrdersAndNotifications();
    } else {
      setAllOrders([]);
      setNotifications([]);
    }
  }, [currentUser]);

  const fetchUserOrdersAndNotifications = async () => {
    if (!currentUser) return;
    try {
      // Fetch notifications
      const nRes = await fetch(`/api/notifications?userId=${currentUser.id}`);
      if (nRes.ok) {
        const nData = await nRes.json();
        setNotifications(nData);
      }

      // Fetch orders
      const oRes = await fetch(`/api/orders?userId=${currentUser.id}&isAdmin=${currentUser.isAdmin}`);
      if (oRes.ok) {
        const oData = await oRes.json();
        setAllOrders(oData);
      }
    } catch (e) {
      console.error('Error fetching backend updates:', e);
    }
  };

  // Mark all notifications as read
  const markNotificationsAsRead = async () => {
    if (!currentUser) return;
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to automatically determine the best firing method based on piece height
  const resolveSmartMethod = (type: FiringType, h: number): string => {
    if (type === 'biscoito') {
      if (h <= 14.5) {
        return 'compartilhada';
      } else if (h <= 30) {
        return 'meia_fornada';
      } else {
        return 'fornada_inteira';
      }
    } else if (type === 'esmalte') {
      if (h <= 14.5) {
        return 'reserva_prateleira';
      } else if (h <= 30) {
        return 'meia_fornada';
      } else {
        return 'fornada_inteira';
      }
    } else if (type === 'monoqueima') {
      if (h <= 14.5) {
        return 'compartilhada';
      } else if (h <= 30) {
        return 'meia_fornada';
      } else {
        return 'fornada_inteira';
      }
    } else { // terceira_queima
      return 'fornada_inteira';
    }
  };

  // Auto-adjust default method and rules when inputs change
  useEffect(() => {
    // Only run manual auto-corrections if NOT in "ajuste_inteligente" mode
    if (metodoQueima !== 'ajuste_inteligente') {
      if (altura > 30) {
        setMetodoQueima('fornada_inteira');
      } else if (altura > 15) {
        if (tipoQueima === 'biscoito' && (metodoQueima === 'compartilhada' || metodoQueima === 'reserva_prateleira')) {
          setMetodoQueima('meia_fornada');
        } else if (tipoQueima === 'ambas' && (metodoQueima === 'compartilhada' || metodoQueima === 'reserva_prateleira')) {
          setMetodoQueima('meia_fornada');
        }
      }
    }

    if (metodoQueimaEsmalte !== 'ajuste_inteligente') {
      if (altura > 30) {
        setMetodoQueimaEsmalte('fornada_inteira');
      } else if (altura > 15) {
        if (tipoQueima === 'esmalte' && metodoQueimaEsmalte === 'reserva_prateleira') {
          setMetodoQueimaEsmalte('meia_fornada');
        } else if (tipoQueima === 'ambas' && metodoQueimaEsmalte === 'reserva_prateleira') {
          setMetodoQueimaEsmalte('meia_fornada');
        }
      }
    }
  }, [altura, tipoQueima, metodoQueima, metodoQueimaEsmalte]);

  // Abrir e tornar obrigatória a Ficha Técnica para Esmalte, Monoqueima e Ambas
  const isGlazeOrMono = tipoQueima === 'esmalte' || tipoQueima === 'monoqueima' || tipoQueima === 'ambas';

  useEffect(() => {
    if (isGlazeOrMono) {
      setIncluirDetalhes(true);
    }
  }, [tipoQueima, isGlazeOrMono]);

  // Calculate price of individual piece based on studio rules
  const calculatePiecePrice = (
    type: FiringType,
    method: string,
    h: number,
    w: number,
    d: number
  ): number => {
    let resolvedMethod = method;
    if (resolvedMethod === 'ajuste_inteligente') {
      resolvedMethod = resolveSmartMethod(type, h);
    }

    const volumeM3 = (h * w * d) / 1000000;

    if (type === 'biscoito') {
      if (resolvedMethod === 'fornada_inteira' || h > 30) {
        return 450.00;
      }
      if (resolvedMethod === 'meia_fornada' || h > 15) {
        return 241.88;
      }
      if (resolvedMethod === 'reserva_prateleira') {
        if (h <= 10) {
          return 108.00;
        } else {
          return 135.00;
        }
      }
      // Compartilhada por volume m³ (baseado em R$ 540,00 para 0,163 m³ útil)
      const volumeCost = volumeM3 * 3312.8837;
      // Garante uma taxa mínima de queima por peça para não dar prejuízo ao ateliê
      const minQueimaVolume = 12.00;
      return Math.max(volumeCost, minQueimaVolume);
    } else if (type === 'esmalte') {
      // Esmalte (Alta temperatura, Cone 7 - 1240ºC)
      if (resolvedMethod === 'fornada_inteira' || h > 30) {
        return 540.00;
      }
      if (resolvedMethod === 'meia_fornada' || h > 15) {
        return 290.25;
      }
      if (resolvedMethod === 'compartilhada') {
        // Compartilhada por volume m³ (baseado em R$ 648,00 para 0,163 m³ útil)
        const volumeCost = volumeM3 * 3975.4601;
        // Garante uma taxa mínima de queima por peça
        const minQueimaVolume = 15.00;
        return Math.max(volumeCost, minQueimaVolume);
      }
      // Prateleira Inteira (10cm: R$ 130,00 | 15cm: R$ 162,50)
      if (h <= 10) {
        return 130.00;
      } else {
        return 162.50;
      }
    } else if (type === 'monoqueima') {
      // Monoqueima (R$ 1.000,00 para o volume útil de 0,163 m³)
      if (resolvedMethod === 'fornada_inteira' || h > 30) {
        return 1000.00;
      }
      if (resolvedMethod === 'meia_fornada' || h > 14.5) {
        return 532.13;
      }
      // Compartilhada por volume m³ (R$ 1.200,00 para o volume útil de 0,163 m³, R$ 7361,96 por metro cúbico)
      const volumeCost = volumeM3 * 7361.9632;
      const minQueimaVolume = 25.00;
      return Math.max(volumeCost, minQueimaVolume);
    } else {
      // Terceira queima (somente forno inteiro - R$ 540,00 para o volume útil de 0,163 m³)
      return 540.00;
    }
  };

  // Dimension warnings
  const isFornadaInteira = useMemo(() => {
    if (tipoQueima === 'ambas') {
      return metodoQueima === 'fornada_inteira' && metodoQueimaEsmalte === 'fornada_inteira';
    }
    if (tipoQueima === 'esmalte') {
      return metodoQueimaEsmalte === 'fornada_inteira';
    }
    if (tipoQueima === 'terceira_queima') {
      return true;
    }
    return metodoQueima === 'fornada_inteira';
  }, [tipoQueima, metodoQueima, metodoQueimaEsmalte]);

  const isPartialFornadaInteira = useMemo(() => {
    return tipoQueima === 'ambas' && (metodoQueima === 'fornada_inteira' || metodoQueimaEsmalte === 'fornada_inteira') && !isFornadaInteira;
  }, [tipoQueima, metodoQueima, metodoQueimaEsmalte, isFornadaInteira]);

  const isTooTall = altura > 60;
  const isTooWide = largura > 53 || profundidade > 53;
  const dimensionError = isTooTall 
    ? 'A peça excede a altura útil máxima do forno de 195L (60 cm).' 
    : isTooWide 
    ? 'A peça excede as dimensões horizontais das prateleiras do forno de 195L (53x53 cm).' 
    : null;

  // Add piece to list
  const handleAddPiece = () => {
    if (!isFornadaInteira && dimensionError) return;

    const pieceAltura = isFornadaInteira ? 0 : altura;
    const pieceLargura = isFornadaInteira ? 0 : largura;
    const pieceProfundidade = isFornadaInteira ? 0 : profundidade;

    const volumeM3 = (pieceAltura * pieceLargura * pieceProfundidade) / 1000000;

    if (tipoQueima === 'ambas') {
      const finalBiscoitoMethod = metodoQueima === 'ajuste_inteligente' ? resolveSmartMethod('biscoito', pieceAltura) : metodoQueima;
      const custoBiscoito = calculatePiecePrice('biscoito', finalBiscoitoMethod, pieceAltura, pieceLargura, pieceProfundidade);
      const pieceBiscoito: PieceItem = {
        id: 'p-' + Date.now() + '-b',
        nome: `${pecaNome.trim() || 'Peça'} (Biscoito)`,
        tipo: 'biscoito',
        metodo: finalBiscoitoMethod as any,
        altura: pieceAltura,
        largura: pieceLargura,
        profundidade: pieceProfundidade,
        volumeM3,
        custoCalculado: custoBiscoito,
        incluirDetalhes,
        detalhesTecnicos: incluirDetalhes ? {
          nacionalidadeMassa,
          marcaMassa: marcaMassa.trim() || 'Não informada',
        } : undefined
      };

      const finalEsmalteMethod = metodoQueimaEsmalte === 'ajuste_inteligente' ? resolveSmartMethod('esmalte', pieceAltura) : metodoQueimaEsmalte;
      const custoEsmalte = calculatePiecePrice('esmalte', finalEsmalteMethod, pieceAltura, pieceLargura, pieceProfundidade);
      const pieceEsmalte: PieceItem = {
        id: 'p-' + Date.now() + '-e',
        nome: `${pecaNome.trim() || 'Peça'} (Esmalte)`,
        tipo: 'esmalte',
        metodo: finalEsmalteMethod as any,
        altura: pieceAltura,
        largura: pieceLargura,
        profundidade: pieceProfundidade,
        volumeM3,
        custoCalculado: custoEsmalte,
        incluirDetalhes,
        detalhesTecnicos: incluirDetalhes ? {
          nacionalidadeMassa,
          marcaMassa: marcaMassa.trim() || 'Não informada',
          tempMaximaQueima,
          tipoEsmalte,
          marcaEsmalte: marcaEsmalte.trim() || 'Estúdio',
          tempMaximaEsmalte,
          quantasCamadas
        } : undefined
      };

      setPiecesList([...piecesList, pieceBiscoito, pieceEsmalte]);
    } else {
      const activeMethod = tipoQueima === 'esmalte' ? metodoQueimaEsmalte : metodoQueima;
      const finalMethod = activeMethod === 'ajuste_inteligente' ? resolveSmartMethod(tipoQueima, pieceAltura) : activeMethod;
      const custo = calculatePiecePrice(tipoQueima, finalMethod, pieceAltura, pieceLargura, pieceProfundidade);

      const isGlazeOrMonoSingle = tipoQueima === 'esmalte' || tipoQueima === 'monoqueima';

      const newPiece: PieceItem = {
        id: 'p-' + Date.now(),
        nome: pecaNome.trim() || `Peça #${piecesList.length + 1}`,
        tipo: tipoQueima,
        metodo: finalMethod as any,
        altura: pieceAltura,
        largura: pieceLargura,
        profundidade: pieceProfundidade,
        volumeM3,
        custoCalculado: custo,
        incluirDetalhes,
        detalhesTecnicos: incluirDetalhes ? {
          nacionalidadeMassa,
          marcaMassa: marcaMassa.trim() || 'Não informada',
          ...(isGlazeOrMonoSingle ? {
            tempMaximaQueima,
            tipoEsmalte,
            marcaEsmalte: marcaEsmalte.trim() || 'Estúdio',
            tempMaximaEsmalte,
            quantasCamadas
          } : {})
        } : undefined
      };

      setPiecesList([...piecesList, newPiece]);
    }

    setGeminiRelatorio(null); // Reset report since list has changed
    
    // Reset form for next piece with defaults
    setPecaNome('Vaso ou Prato');
    setIncluirDetalhes(false);
    setMarcaMassa('');
    setMarcaEsmalte('');
  };

  // Remove piece
  const handleRemovePiece = (id: string) => {
    setPiecesList(piecesList.filter(p => p.id !== id));
    setGeminiRelatorio(null);
  };

  // Editing state for pieces in quote summary
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [editPieceName, setEditPieceName] = useState<string>('');
  const [editPieceAltura, setEditPieceAltura] = useState<number>(10);
  const [editPieceLargura, setEditPieceLargura] = useState<number>(10);
  const [editPieceProfundidade, setEditPieceProfundidade] = useState<number>(10);

  const handleStartEditPiece = (p: PieceItem) => {
    setEditingPieceId(p.id);
    setEditPieceName(p.nome);
    setEditPieceAltura(p.altura);
    setEditPieceLargura(p.largura);
    setEditPieceProfundidade(p.profundidade);
  };

  const handleSaveEditPiece = (id: string) => {
    const alt = Math.max(0, editPieceAltura);
    const larg = Math.max(0, editPieceLargura);
    const prof = Math.max(0, editPieceProfundidade);
    const vol = (alt * larg * prof) / 1000000;

    setPiecesList(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          nome: editPieceName.trim() || item.nome,
          altura: alt,
          largura: larg,
          profundidade: prof,
          volumeM3: vol
        };
      }
      return item;
    }));

    setEditingPieceId(null);
    setGeminiRelatorio(null);
  };

  const handleCancelEditPiece = () => {
    setEditingPieceId(null);
  };

  // Total calculation for the whole quote based on the virtual kiln simulation packing
  const orcamentoDetalhado = useMemo(() => {
    if (piecesList.length === 0) {
      return {
        volumeTotalGeometricoL: 0,
        volumeEfetivoOcupadoL: 0,
        porcentagemOcupacaoForno: 0,
        qtdPrateleiras: 0,
        alturaOcupadaCm: 0,
        qtdNiveisEstimada: 0,
        modalidadeCobranca: 'Nenhuma',
        valorFinalQueima: 0,
        pisoAplicado: false,
        detalhesGrupos: []
      };
    }

    // Run the packing simulation considering podeSobreporBiscoito
    const shelves = packPiecesOnShelves(piecesList, { podeSobreporBiscoito });

    // 1. Volume total geométrico das peças
    const volumeTotalGeometricoL = piecesList.reduce((acc, curr) => acc + (curr.volumeM3 * 1000), 0);

    // Useful Shelf Area
    const SHELF_RADIUS = 26.5; // 53cm diameter useful shelf area
    const totalShelfArea = Math.PI * SHELF_RADIUS * SHELF_RADIUS; // ~2206.2 cm²

    // 2. Volume efetivamente ocupado
    const volumeEfetivoOcupadoCm3 = shelves.reduce((acc, s) => {
      const area = s.utilizationArea || 0;
      const height = s.maxHeight || 0;
      return acc + (area * height);
    }, 0);
    const volumeEfetivoOcupadoL = volumeEfetivoOcupadoCm3 / 1000;

    // 3. Porcentagem de ocupação do forno (referência de 163 litros úteis)
    const porcentagemOcupacaoForno = Math.min((volumeEfetivoOcupadoL / 163) * 100, 100);

    // 4. Quantidade de prateleiras utilizadas
    const qtdPrateleiras = shelves.length;

    // 5. Altura ocupada no forno
    const alturaOcupadaCm = shelves.reduce((acc, s) => acc + (s.maxHeight || 0), 0);

    // 6. Quantidade estimada de níveis
    const qtdNiveisEstimada = qtdPrateleiras;

    // Group shelves by firing type to compute group pricing
    const groups: Record<FiringType, typeof shelves> = {
      biscoito: [],
      esmalte: [],
      monoqueima: [],
      terceira_queima: []
    };

    shelves.forEach(s => {
      if (groups[s.tipo as FiringType]) {
        groups[s.tipo as FiringType].push(s);
      }
    });

    let totalCost = 0;
    let anyPisoAplicado = false;
    const detalhesGrupos: Array<{
      tipo: FiringType;
      shelves: typeof shelves;
      mode: string;
      cost: number;
    }> = [];

    // Firing-specific rates and methods
    Object.keys(groups).forEach(key => {
      const type = key as FiringType;
      const groupShelves = groups[type];
      if (groupShelves.length === 0) return;

      const groupHeight = groupShelves.reduce((acc, s) => acc + (s.maxHeight || 0), 0);
      const groupNumShelves = groupShelves.length;
      
      const groupPieces = piecesList.filter(p => p.tipo === type);

      let costFornadaInteira = 0;
      let costMeiaFornada = 0;
      let costCompartilhada = 0;
      let costReservaPrateleira = 0;
      let costPisoPrateleiras = 0;
      let pureVolCost = 0;

      if (type === 'biscoito') {
        costFornadaInteira = 450.00;
        costMeiaFornada = 241.88;
        pureVolCost = groupPieces.reduce((sum, p) => {
          const vCost = p.volumeM3 * 3312.8837;
          return sum + Math.max(vCost, 12.00);
        }, 0);
        costReservaPrateleira = groupShelves.reduce((sum, s) => {
          if (s.maxHeight <= 10) return sum + 108.00;
          return sum + 135.00;
        }, 0);

        // Shelf occupation floor minimum (Piso Mínimo por Prateleiras Ocupadas: 1/4, 2/4, 3/4, 4/4)
        if (groupNumShelves === 1) {
          costPisoPrateleiras = Math.max(costFornadaInteira * 0.25, costReservaPrateleira);
        } else if (groupNumShelves === 2) {
          costPisoPrateleiras = Math.max(costFornadaInteira * 0.50, costMeiaFornada);
        } else if (groupNumShelves === 3) {
          costPisoPrateleiras = costFornadaInteira * 0.75;
        } else if (groupNumShelves >= 4) {
          costPisoPrateleiras = costFornadaInteira * (groupNumShelves / 4);
        }

        costCompartilhada = Math.max(pureVolCost, costPisoPrateleiras);

      } else if (type === 'esmalte') {
        costFornadaInteira = 540.00;
        costMeiaFornada = 290.25;
        pureVolCost = groupPieces.reduce((sum, p) => {
          const vCost = p.volumeM3 * 3975.4601;
          return sum + Math.max(vCost, 15.00);
        }, 0);
        costReservaPrateleira = groupShelves.reduce((sum, s) => {
          if (s.maxHeight <= 10) return sum + 130.00;
          return sum + 162.50;
        }, 0);

        if (groupNumShelves === 1) {
          costPisoPrateleiras = Math.max(costFornadaInteira * 0.25, costReservaPrateleira);
        } else if (groupNumShelves === 2) {
          costPisoPrateleiras = Math.max(costFornadaInteira * 0.50, costMeiaFornada);
        } else if (groupNumShelves === 3) {
          costPisoPrateleiras = costFornadaInteira * 0.75;
        } else if (groupNumShelves >= 4) {
          costPisoPrateleiras = costFornadaInteira * (groupNumShelves / 4);
        }

        costCompartilhada = Math.max(pureVolCost, costPisoPrateleiras);

      } else if (type === 'monoqueima') {
        costFornadaInteira = 1000.00;
        costMeiaFornada = 532.13;
        pureVolCost = groupPieces.reduce((sum, p) => {
          const vCost = p.volumeM3 * 7361.9632;
          return sum + Math.max(vCost, 25.00);
        }, 0);

        if (groupNumShelves === 1) {
          costPisoPrateleiras = costFornadaInteira * 0.25;
        } else if (groupNumShelves === 2) {
          costPisoPrateleiras = Math.max(costFornadaInteira * 0.50, costMeiaFornada);
        } else if (groupNumShelves === 3) {
          costPisoPrateleiras = costFornadaInteira * 0.75;
        } else if (groupNumShelves >= 4) {
          costPisoPrateleiras = costFornadaInteira * (groupNumShelves / 4);
        }

        costCompartilhada = Math.max(pureVolCost, costPisoPrateleiras);

      } else if (type === 'terceira_queima') {
        costFornadaInteira = 540.00;
        pureVolCost = 540.00;
        costCompartilhada = 540.00;
      }

      if (costPisoPrateleiras > pureVolCost) {
        anyPisoAplicado = true;
      }

      const fitsInMeia = groupHeight <= 30 && groupNumShelves <= 2 && groupPieces.every(p => p.altura <= 30);
      const fitsInReserva = (type === 'esmalte' || type === 'biscoito') && groupPieces.every(p => p.altura <= 15);

      let selectedMode = 'ajuste_inteligente';
      if (type === 'biscoito') {
        selectedMode = metodoQueima;
      } else if (type === 'esmalte') {
        selectedMode = metodoQueimaEsmalte;
      } else {
        selectedMode = 'ajuste_inteligente';
      }

      let resolvedMode = 'Compartilhada';
      let finalGroupCost = 0;

      if (selectedMode === 'fornada_inteira') {
        resolvedMode = 'Fornada Inteira';
        finalGroupCost = costFornadaInteira * Math.max(1, Math.ceil(groupNumShelves / 4));
      } else if (selectedMode === 'meia_fornada') {
        if (fitsInMeia) {
          resolvedMode = 'Meia Fornada';
          finalGroupCost = costMeiaFornada;
        } else {
          resolvedMode = 'Fornada Inteira (Forçado - Excede Meia)';
          finalGroupCost = costFornadaInteira;
        }
      } else if (selectedMode === 'compartilhada') {
        if (costPisoPrateleiras > pureVolCost) {
          resolvedMode = `Compartilhada (${groupNumShelves}/4 Prateleiras)`;
        } else {
          resolvedMode = 'Compartilhada (m³)';
        }
        finalGroupCost = costCompartilhada;
      } else if (selectedMode === 'reserva_prateleira' && (type === 'esmalte' || type === 'biscoito')) {
        if (fitsInReserva) {
          resolvedMode = 'Prateleira Inteira';
          finalGroupCost = costReservaPrateleira;
        } else {
          resolvedMode = 'Meia Fornada (Forçado - Excede Prateleira)';
          finalGroupCost = fitsInMeia ? costMeiaFornada : costFornadaInteira;
        }
      } else {
        // Ajuste Inteligente
        const options: Array<{ mode: string; cost: number }> = [];
        const compartilhadaLabel = costPisoPrateleiras > pureVolCost 
          ? `Compartilhada (${groupNumShelves}/4 Prateleiras)` 
          : 'Compartilhada (m³)';
        options.push({ mode: compartilhadaLabel, cost: costCompartilhada });
        if (fitsInMeia) {
          options.push({ mode: 'Meia Fornada', cost: costMeiaFornada });
        }
        options.push({ mode: 'Fornada Inteira', cost: costFornadaInteira * Math.max(1, Math.ceil(groupNumShelves / 4)) });
        if ((type === 'esmalte' || type === 'biscoito') && fitsInReserva) {
          options.push({ mode: 'Prateleira Inteira', cost: costReservaPrateleira });
        }
        options.sort((a, b) => a.cost - b.cost);
        resolvedMode = options[0].mode;
        finalGroupCost = options[0].cost;
      }

      totalCost += finalGroupCost;
      detalhesGrupos.push({
        tipo: type,
        shelves: groupShelves,
        mode: resolvedMode,
        cost: finalGroupCost
      });
    });

    let modalidadeCobranca = 'Nenhuma';
    if (detalhesGrupos.length === 1) {
      modalidadeCobranca = detalhesGrupos[0].mode;
    } else if (detalhesGrupos.length > 1) {
      modalidadeCobranca = detalhesGrupos.map(dg => `${dg.tipo.toUpperCase()}: ${dg.mode}`).join(' | ');
    }

    return {
      volumeTotalGeometricoL,
      volumeEfetivoOcupadoL,
      porcentagemOcupacaoForno,
      qtdPrateleiras,
      alturaOcupadaCm,
      qtdNiveisEstimada,
      modalidadeCobranca,
      valorFinalQueima: totalCost,
      pisoAplicado: anyPisoAplicado,
      detalhesGrupos
    };
  }, [piecesList, metodoQueima, metodoQueimaEsmalte, podeSobreporBiscoito]);

  const piecesWithAdjustedCosts = useMemo(() => {
    const costMap: Record<string, number> = {};

    // Group pieces by tipo
    const groups: Record<FiringType, PieceItem[]> = {
      biscoito: [],
      esmalte: [],
      monoqueima: [],
      terceira_queima: []
    };

    piecesList.forEach(p => {
      if (groups[p.tipo]) {
        groups[p.tipo].push(p);
      }
    });

    // For each group, we find its final cost in orcamentoDetalhado
    const detalhesGrupos = orcamentoDetalhado.detalhesGrupos;

    Object.keys(groups).forEach(key => {
      const type = key as FiringType;
      const groupPieces = groups[type];
      if (groupPieces.length === 0) return;

      const grupoDetalhe = detalhesGrupos.find(dg => dg.tipo === type);
      const finalGroupCost = grupoDetalhe ? grupoDetalhe.cost : 0;

      const totalVolume = groupPieces.reduce((sum, p) => sum + p.volumeM3, 0);
      groupPieces.forEach(p => {
        const share = totalVolume > 0 
          ? (p.volumeM3 / totalVolume) * finalGroupCost 
          : finalGroupCost / groupPieces.length;
        costMap[p.id] = share;
      });
    });

    return piecesList.map(p => ({
      ...p,
      custoCalculado: costMap[p.id] !== undefined ? costMap[p.id] : p.custoCalculado
    }));
  }, [piecesList, orcamentoDetalhado]);

  const totalOrcamento = orcamentoDetalhado.valorFinalQueima;

  // Copy Quote & WhatsApp share text
  const generateMessageText = (): string => {
    let msg = `*ORÇAMENTO DE QUEIMA - OLLARIA ATELIE QUEIMA ALTA TEMPERATURA*\n`;
    msg += `--------------------------------------------------\n`;
    msg += `*Especificação do Forno:* 195 Litros | Cone 7 (1240ºC)\n\n`;
    
    piecesWithAdjustedCosts.forEach((p, idx) => {
      const tipoLabel = p.tipo === 'biscoito' ? 'Queima de Biscoito (1000ºC)' :
                        p.tipo === 'esmalte' ? 'Queima de Esmalte (1240ºC)' :
                        p.tipo === 'monoqueima' ? 'Monoqueima (1240ºC)' : 'Terceira Queima (750ºC)';
      const metodoLabel = p.metodo === 'compartilhada' ? 'Compartilhada (m³)' : 
                          p.metodo === 'reserva_prateleira' ? 'Prateleira Inteira' :
                          p.metodo === 'meia_fornada' ? 'Meia Fornada' : 'Fornada Inteira';

      msg += `*${idx + 1}. ${p.nome}*\n`;
      msg += `  • Tipo: ${tipoLabel}\n`;
      msg += `  • Modalidade: ${metodoLabel}\n`;
      msg += `  • Medidas: ${p.altura}x${p.largura}x${p.profundidade} cm (A x L x P)\n`;
      msg += `  • Volume: ${(p.volumeM3 * 1000).toFixed(3)}L / ${p.volumeM3.toFixed(6)} m³\n`;
      msg += `  • Custo Unitário Referência: R$ ${p.custoCalculado.toFixed(2)}\n`;

      if (p.detalhesTecnicos) {
        msg += `  • _Info Técnica:_ Argila ${p.detalhesTecnicos.nacionalidadeMassa} (${p.detalhesTecnicos.marcaMassa}), Temp Máx: ${p.detalhesTecnicos.tempMaximaQueima}ºC\n`;
        if (p.tipo === 'esmalte' || p.tipo === 'monoqueima' || p.tipo === 'terceira_queima') {
          msg += `    Esmalte: ${p.detalhesTecnicos.tipoEsmalte || 'N/A'} (${p.detalhesTecnicos.marcaEsmalte || 'N/A'}), ${p.detalhesTecnicos.quantasCamadas || 0} camadas, Temp Máx: ${p.detalhesTecnicos.tempMaximaEsmalte || 1240}ºC\n`;
        }
      }
      msg += `\n`;
    });

    msg += `--------------------------------------------------\n`;
    msg += `*RELATÓRIO DE OCUPAÇÃO REAL (SIMULAÇÃO):*\n`;
    msg += `  • Volume Total das Peças: ${orcamentoDetalhado.volumeTotalGeometricoL.toFixed(3)} L\n`;
    msg += `  • Volume Efetivamente Ocupado: ${orcamentoDetalhado.volumeEfetivoOcupadoL.toFixed(3)} L\n`;
    msg += `  • Ocupação Útil do Forno: ${orcamentoDetalhado.porcentagemOcupacaoForno.toFixed(1)}%\n`;
    msg += `  • Prateleiras Utilizadas: ${orcamentoDetalhado.qtdPrateleiras}\n`;
    msg += `  • Altura Ocupada: ${orcamentoDetalhado.alturaOcupadaCm} cm\n`;
    msg += `  • Níveis de Prateleira: ${orcamentoDetalhado.qtdNiveisEstimada}\n`;
    msg += `  • Modalidade de Cobrança: ${orcamentoDetalhado.modalidadeCobranca}\n`;
    msg += `--------------------------------------------------\n`;
    msg += `*OBSERVAÇÕES E TERMOS TÉCNICOS*\n\n`;
    msg += `• As medidas consideradas são sempre as dimensões máximas da peça, incluindo alças, bicos, pés e saliências.\n`;
    msg += `• O acondicionamento das peças no forno é de responsabilidade técnica exclusiva do Ateliê Ollaria Cerâmica, visando o melhor aproveitamento do espaço e a segurança da queima.\n`;
    msg += `• Na queima de esmalte, o espaçamento técnico de segurança entre as peças é indispensável para evitar fusão e danos.\n`;
    msg += `• As temperaturas de referência utilizadas pelo ateliê são:\n`;
    msg += `  - Queima de biscoito: aproximadamente 1.000 °C;\n`;
    msg += `  - Queima de esmalte e monoqueima: aproximadamente 1.240 °C.\n`;
    msg += `• Todo forno cerâmico apresenta pequenas variações naturais de temperatura entre diferentes regiões da câmara de queima. Essas diferenças são inerentes ao processo cerâmico e não caracterizam falha do equipamento nem responsabilidade do ateliê.\n`;
    msg += `• Caso o cliente deseje acompanhamento por cones pirométricos, deverá solicitá-lo previamente. Os cones são cobrados por unidade utilizada, e o serviço de acompanhamento e leitura possui cobrança adicional.\n`;
    msg += `• Peças destinadas à queima de esmalte passam por avaliação técnica quanto à compatibilidade da argila, esmalte e temperatura de queima. O ateliê poderá recusar peças que apresentem risco ao forno ou às demais peças da fornada.\n`;
    msg += `• Caso o esmalte escorra e provoque danos às prateleiras, placas, suportes ou demais componentes do forno, o cliente será responsável pelos custos de limpeza, reparo ou substituição dos materiais danificados.\n`;
    msg += `• O processo cerâmico envolve riscos inerentes, como trincas, rachaduras, empenamentos, deformações, bolhas, pinholes, variações de cor, diferenças de textura e outras alterações decorrentes da secagem, da formulação dos esmaltes, da argila ou da compatibilidade entre materiais. Tais ocorrências fazem parte da natureza da cerâmica e não caracterizam responsabilidade do ateliê.\n`;
    msg += `• O Ateliê Ollaria Cerâmica é responsável pela correta condução do processo de queima, não podendo garantir resultados estéticos ou técnicos decorrentes da construção da peça, da qualidade da argila, da aplicação de esmaltes ou da compatibilidade entre os materiais utilizados pelo cliente.\n`;
    
    return msg;
  };

  const handleCopyClipboard = () => {
    const text = generateMessageText();
    navigator.clipboard.writeText(text);
    setCopiedMessage('Orçamento copiado para a área de transferência!');
    setTimeout(() => setCopiedMessage(null), 3000);
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(generateMessageText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSendEmail = () => {
    const cleanText = generateMessageText().replace(/\*/g, ''); // strip asterisks for cleaner email rendering
    const subject = encodeURIComponent('Orçamento de Queima - Ollaria Ateliê');
    const body = encodeURIComponent(cleanText);
    window.open(`mailto:ollariaatelie@gmail.com?subject=${subject}&body=${body}`, '_blank');
  };

  // Client-side PDF Generation with jsPDF
  const handleGeneratePDF = () => {
    try {
      const doc = new jsPDF();

      // Embed structured digital metadata for 100% instant re-importing
      const pdfMetaPayload = {
        version: 1,
        app: 'Ollaria Ateliê',
        timestamp: new Date().toISOString(),
        pieces: piecesWithAdjustedCosts.map(p => ({
          nome: p.nome,
          tipo: p.tipo,
          metodo: p.metodo,
          altura: p.altura,
          largura: p.largura,
          profundidade: p.profundidade,
          detalhesTecnicos: p.detalhesTecnicos,
          incluirDetalhes: p.incluirDetalhes
        }))
      };
      const jsonMetaString = JSON.stringify(pdfMetaPayload);
      const b64Meta = btoa(unescape(encodeURIComponent(jsonMetaString)));

      doc.setProperties({
        title: 'Orçamento de Queima - Ollaria Ateliê',
        subject: `OLLARIA_ORDER_DATA_V1:${b64Meta}`,
        author: 'Ollaria Ateliê',
        keywords: `OLLARIA_ORDER_DATA_V1:${b64Meta}`
      });
      
      // Theme colors for PDF
      const terracottaColor = '#C15E3F';
      const charcoalColor = '#4A443F';
      
      // Header
      doc.setFillColor(242, 239, 233); // Light gray-beige (#F2EFE9)
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(74, 68, 63); // Charcoal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('ATELIE CERAMICO', 15, 18);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(193, 94, 63); // Terracotta
      doc.text('Calculadora Profissional de Queima & Orcamentos', 15, 26);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(138, 132, 124);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 15, 34);
      
      // Forno specifications box
      doc.setDrawColor(226, 222, 208);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, 48, 180, 20, 3, 3, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(74, 68, 63);
      doc.text('ESPECIFICACOES DO FORNO', 20, 54);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Capacidade: 195 Litros | Temperatura Maxima: Alta Temperatura (1240oC - Cone 7) | Queima de Biscoito: 1000oC', 20, 61);

      // Pieces list
      let y = 78;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(74, 68, 63);
      doc.text('ITENS DO ORCAMENTO', 15, y);
      y += 8;

      piecesWithAdjustedCosts.forEach((p, idx) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        // Draw card background
        doc.setFillColor(253, 247, 245);
        doc.roundedRect(15, y, 180, p.detalhesTecnicos ? 38 : 24, 2, 2, 'F');
        doc.setDrawColor(226, 222, 208);
        doc.roundedRect(15, y, 180, p.detalhesTecnicos ? 38 : 24, 2, 2, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(193, 94, 63);
        doc.text(`${idx + 1}. ${p.nome}`, 20, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(45, 45, 45);
        
        const tipoLabel = p.tipo === 'biscoito' ? 'Queima de Biscoito (1000oC)' :
                          p.tipo === 'esmalte' ? 'Queima de Esmalte (Alta Temp - 1240oC)' :
                          p.tipo === 'monoqueima' ? 'Monoqueima (1240oC)' : 'Terceira Queima (750oC)';
        const metodoLabel = p.metodo === 'compartilhada' ? 'Compartilhada (por volume)' : 
                            p.metodo === 'reserva_prateleira' ? 'Prateleira Inteira' :
                            p.metodo === 'meia_fornada' ? 'Meia Fornada' : 'Fornada Inteira';

        doc.text(`Tipo de Queima: ${tipoLabel} | Modalidade: ${metodoLabel}`, 20, y + 12);
        doc.text(`Dimensoes: ${p.altura} x ${p.largura} x ${p.profundidade} cm | Volume: ${(p.volumeM3 * 1000).toFixed(2)} Litros`, 20, y + 17);

        // Price on the right
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(74, 68, 63);
        doc.text(`R$ ${p.custoCalculado.toFixed(2)}`, 165, y + 12);

        if (p.detalhesTecnicos) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8.5);
          doc.setTextColor(138, 132, 124);
          let techStr = `Argila: ${p.detalhesTecnicos.nacionalidadeMassa} (${p.detalhesTecnicos.marcaMassa}) | Temp Max Argila: ${p.detalhesTecnicos.tempMaximaQueima}oC`;
          if (p.tipo === 'esmalte' || p.tipo === 'monoqueima' || p.tipo === 'terceira_queima') {
            techStr += `\nEsmalte: ${p.detalhesTecnicos.tipoEsmalte || 'N/A'} (${p.detalhesTecnicos.marcaEsmalte || 'N/A'}) | Camadas: ${p.detalhesTecnicos.quantasCamadas || 0} | Temp Max: ${p.detalhesTecnicos.tempMaximaEsmalte || 1240}oC`;
          }
          doc.text(techStr, 20, y + 24);
        }

        y += p.detalhesTecnicos ? 44 : 30;
      });

      // Technical Occupancy Report block in PDF
      if (y > 180) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(245, 243, 239);
      doc.roundedRect(15, y, 180, 38, 2, 2, 'F');
      doc.setDrawColor(226, 222, 208);
      doc.roundedRect(15, y, 180, 38, 2, 2, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(74, 68, 63);
      doc.text('RELATORIO TECNICO DE OCUPACAO REAL (SIMULACAO)', 20, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(45, 45, 45);
      doc.text(`Volume Total das Pecas: ${orcamentoDetalhado.volumeTotalGeometricoL.toFixed(3)} L | Volume Efetivamente Ocupado: ${orcamentoDetalhado.volumeEfetivoOcupadoL.toFixed(3)} L`, 20, y + 14);
      doc.text(`Porcentagem Ocupacao Util Forno: ${orcamentoDetalhado.porcentagemOcupacaoForno.toFixed(1)}% | Altura Ocupada Forno: ${orcamentoDetalhado.alturaOcupadaCm} cm`, 20, y + 20);
      doc.text(`Quantidade Prateleiras: ${orcamentoDetalhado.qtdPrateleiras} | Niveis de Prateleira: ${orcamentoDetalhado.qtdNiveisEstimada}`, 20, y + 26);
      doc.text(`Modalidade de Cobranca Decidida: ${orcamentoDetalhado.modalidadeCobranca}`, 20, y + 32);

      y += 44;

      // Total and Terms box
      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(193, 94, 63);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(74, 68, 63);
      doc.text('VALOR TOTAL ESTIMADO:', 15, y);
      
      doc.setFontSize(16);
      doc.setTextColor(193, 94, 63);
      doc.text(`R$ ${totalOrcamento.toFixed(2)}`, 155, y);
      y += 12;

      // Official OBSERVAÇÕES E TERMOS TÉCNICOS block in PDF
      const termosTecnicosPDF = [
        "As medidas consideradas são sempre as dimensões máximas da peça, incluindo alças, bicos, pés e saliências.",
        "O acondicionamento das peças no forno é de responsabilidade técnica exclusiva do Ateliê Ollaria Cerâmica, visando o melhor aproveitamento do espaço e a segurança da queima.",
        "Na queima de esmalte, o espaçamento técnico de segurança entre as peças é indispensável para evitar fusão e danos.",
        "As temperaturas de referência utilizadas pelo ateliê são: Queima de biscoito (~1.000 °C); Queima de esmalte e monoqueima (~1.240 °C).",
        "Todo forno cerâmico apresenta pequenas variações naturais de temperatura entre diferentes regiões da câmara de queima. Essas diferenças são inerentes ao processo cerâmico e não caracterizam falha do equipamento nem responsabilidade do ateliê.",
        "Caso o cliente deseje acompanhamento por cones pirométricos, deverá solicitá-lo previamente. Os cones são cobrados por unidade utilizada, e o serviço de acompanhamento e leitura possui cobrança adicional.",
        "Peças destinadas à queima de esmalte passam por avaliação técnica quanto à compatibilidade da argila, esmalte e temperatura de queima. O ateliê poderá recusar peças que apresentem risco ao forno ou às demais peças da fornada.",
        "Caso o esmalte escorra e provoque danos às prateleiras, placas, suportes ou demais componentes do forno, o cliente será responsável pelos custos de limpeza, reparo ou substituição dos materiais danificados.",
        "O processo cerâmico envolve riscos inerentes, como trincas, rachaduras, empenamentos, deformações, bolhas, pinholes, variações de cor, diferenças de textura e outras alterações decorrentes da secagem, da formulação dos esmaltes, da argila ou da compatibilidade entre materiais. Tais ocorrências fazem parte da natureza da cerâmica e não caracterizam responsabilidade do ateliê.",
        "O Ateliê Ollaria Cerâmica é responsável pela correta condução do processo de queima, não podendo garantir resultados estéticos ou técnicos decorrentes da construção da peça, da qualidade da argila, da aplicação de esmaltes ou da compatibilidade entre os materiais utilizados pelo cliente."
      ];

      if (y > 200) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(249, 248, 246);
      doc.setDrawColor(226, 222, 208);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(193, 94, 63);
      doc.text('OBSERVAÇÕES E TERMOS TÉCNICOS', 15, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(74, 68, 63);

      termosTecnicosPDF.forEach((term) => {
        const lines = doc.splitTextToSize(`• ${term}`, 180);
        const blockHeight = lines.length * 3.8;

        if (y + blockHeight > 280) {
          doc.addPage();
          y = 20;
        }

        doc.text(lines, 15, y);
        y += blockHeight + 1.5;
      });

      doc.save(`orcamento-atelie-ollaria.pdf`);
    } catch (e) {
      console.error('Error generating PDF:', e);
      alert('Houve um erro ao gerar o PDF. Verifique se as informações inseridas estão corretas.');
    }
  };

  // Call Gemini API on the server to analyze the pieces technically
  const handleGeminiAnalysis = async () => {
    if (piecesList.length === 0) return;
    setIsAnalyzingTech(true);
    setGeminiRelatorio(null);

    try {
      const response = await fetch('/api/gemini/analyze-technical', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pecas: piecesList })
      });

      if (response.ok) {
        const data = await response.json();
        setGeminiRelatorio(data);
      } else {
        const err = await response.json();
        alert(err.error || 'Erro na avaliação técnica do Gemini.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao se conectar ao servidor para gerar a avaliação técnica.');
    } finally {
      setIsAnalyzingTech(false);
    }
  };

  // Auth Submit handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = authMode === 'login' 
        ? { email: authEmail, senha: authPassword }
        : { nome: authNome, email: authEmail, senha: authPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('atelie_user', JSON.stringify(data.user));
        setShowAuthModal(false);
        setAuthPassword('');
        setAuthEmail('');
        setAuthNome('');
      } else {
        setAuthError(data.error || 'Erro ao autenticar.');
      }
    } catch (err) {
      setAuthError('Erro na conexão com o servidor.');
    }
  };

  // Log out
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('atelie_user');
    setActiveTab('orcamento');
  };

  // Save order to the cloud
  const handleSaveOrderToCloud = async () => {
    if (!currentUser) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }

    if (piecesList.length === 0) {
      alert('Adicione pelo menos uma peça para salvar o orçamento.');
      return;
    }

    if (!aceitouDanosEsmalte && piecesList.some(p => p.tipo === 'esmalte' || p.tipo === 'monoqueima' || p.tipo === 'terceira_queima')) {
      alert('Você precisa aceitar os termos de responsabilidade técnica de esmalte antes de enviar.');
      return;
    }

    setSavingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: currentUser.id,
          clienteNome: currentUser.nome,
          clienteEmail: currentUser.email,
          pecas: piecesWithAdjustedCosts,
          total: totalOrcamento
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setPiecesList([]); // Clear current workspace list
        setGeminiRelatorio(null);
        setAceitouDanosEsmalte(false);
        fetchUserOrdersAndNotifications(); // Refresh history
        setActiveTab('historico'); // Redirect to order list
      } else {
        alert(data.error || 'Erro ao salvar orçamento.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao conectar ao servidor.');
    } finally {
      setSavingOrder(false);
    }
  };

  // Admin: Update order status
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchUserOrdersAndNotifications(); // Refresh
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar status.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Stats calculation for Admin Dashboard
  const adminStats = (() => {
    const totalRevenue = allOrders
      .filter(o => o.status !== 'cancelado')
      .reduce((sum, o) => sum + o.total, 0);
    
    const countPendente = allOrders.filter(o => o.status === 'pendente').length;
    const countQueimando = allOrders.filter(o => o.status === 'queimando').length;
    const countConcluido = allOrders.filter(o => o.status === 'concluido').length;
    
    // Status distribution chart data
    const statusData = [
      { name: 'Pendentes', value: countPendente, fill: '#E6B89C' },
      { name: 'Em Análise', value: allOrders.filter(o => o.status === 'em_analise').length, fill: '#D3A297' },
      { name: 'Aprovados', value: allOrders.filter(o => o.status === 'aprovado').length, fill: '#A8C3A0' },
      { name: 'No Forno', value: countQueimando, fill: '#C15E3F' },
      { name: 'Concluídos', value: countConcluido, fill: '#4A443F' },
    ];

    return { totalRevenue, countPendente, countQueimando, countConcluido, statusData };
  })();

  // Filter orders for admin list
  const filteredOrders = allOrders.filter(o => {
    if (adminFilterStatus === 'todos') return true;
    return o.status === adminFilterStatus;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F8F6] text-[#2D2D2D] font-sans antialiased">
      {/* Header Navigation */}
      <header className="h-16 border-b border-[#E2DED0] px-4 md:px-8 flex items-center justify-between bg-white shrink-0 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C15E3F] rounded-full flex items-center justify-center text-white font-bold shadow-md shadow-[#C15E3F]/20">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-[#4A443F] flex items-center gap-1.5">
              Ollaria atelie <span className="text-[#C15E3F] italic font-normal text-sm md:text-base">Queima Alta Temperatura</span>
            </h1>
            <p className="text-[10px] text-[#8A847C] hidden sm:block">FORNO COMPOSTO DE 195 LITROS • CONE 7 (1240ºC)</p>
          </div>
        </div>

        {/* Desktop and Tablet Menu */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex gap-4 md:gap-6 text-xs md:text-sm font-semibold uppercase tracking-widest text-[#8A847C]">
            <button 
              onClick={() => setActiveTab('orcamento')}
              className={`pb-1 border-b-2 transition-all cursor-pointer ${activeTab === 'orcamento' ? 'text-[#C15E3F] border-[#C15E3F]' : 'border-transparent hover:text-[#4A443F]'}`}
              id="tab-orcamento"
            >
              Orçamento
            </button>
            <button 
              onClick={() => {
                if (!currentUser) {
                  setAuthMode('login');
                  setShowAuthModal(true);
                } else {
                  setActiveTab('historico');
                }
              }}
              className={`pb-1 border-b-2 transition-all cursor-pointer ${activeTab === 'historico' ? 'text-[#C15E3F] border-[#C15E3F]' : 'border-transparent hover:text-[#4A443F]'}`}
              id="tab-historico"
            >
              Meus Pedidos
            </button>
            {currentUser?.isAdmin && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`pb-1 border-b-2 transition-all cursor-pointer ${activeTab === 'admin' ? 'text-[#C15E3F] border-[#C15E3F]' : 'border-transparent hover:text-[#4A443F]'}`}
                id="tab-admin"
              >
                Painel Admin
              </button>
            )}
          </div>

          <div className="h-6 w-[1px] bg-[#E2DED0] hidden xs:block"></div>

          {/* User Section & Notifications */}
          <div className="flex items-center gap-2 xs:gap-3">
            {currentUser ? (
              <>
                {/* Notification Bell */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setShowNotificationTray(!showNotificationTray);
                      if (!showNotificationTray) {
                        markNotificationsAsRead();
                      }
                    }}
                    className="p-1.5 text-[#4A443F] hover:bg-[#F2EFE9] rounded-full relative cursor-pointer"
                    id="btn-notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {notifications.some(n => !n.lida) && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#C15E3F] rounded-full ring-2 ring-white"></span>
                    )}
                  </button>

                  {/* Notification Tray Dropdown */}
                  {showNotificationTray && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E2DED0] rounded-xl shadow-xl z-50 p-4 max-h-[400px] overflow-y-auto">
                      <div className="flex justify-between items-center pb-2 border-b border-[#F2EFE9] mb-2">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-[#4A443F]">Notificações</h3>
                        <span className="text-[10px] bg-[#F2EFE9] px-2 py-0.5 rounded text-[#8A847C]">
                          {notifications.filter(n => !n.lida).length} novas
                        </span>
                      </div>
                      <div className="space-y-3 pt-1">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-center text-[#8A847C] py-4">Nenhuma notificação por enquanto.</p>
                        ) : (
                          notifications.map(n => (
                            <div key={n.id} className={`p-2.5 rounded-lg text-xs transition-colors ${n.lida ? 'bg-white' : 'bg-[#FDF7F5] border-l-2 border-[#C15E3F]'}`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-[#4A443F]">{n.titulo}</span>
                                <span className="text-[9px] text-[#8A847C]">{new Date(n.data).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <p className="text-[#2D2D2D] leading-relaxed text-[11px]">{n.mensagem}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden md:flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-[#4A443F]">{currentUser.nome}</span>
                  <span className="text-[10px] text-[#8A847C]">{currentUser.isAdmin ? 'Administrador' : 'Ceramista'}</span>
                </div>

                <button 
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-full cursor-pointer transition-colors"
                  title="Sair"
                  id="btn-logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4A443F] text-white rounded-lg text-xs font-bold hover:bg-[#3d3732] transition-colors cursor-pointer"
                id="btn-login-trigger"
              >
                <LogIn className="w-3.5 h-3.5" />
                Entrar / Cadastrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl mx-auto w-full">
        
        {/* TAB 1: ORÇAMENTO / CALCULADORA */}
        {activeTab === 'orcamento' && (
          <>
            {/* Left: Input Panel */}
            <section className="flex-1 lg:max-w-[650px] border-r border-[#E2DED0] p-4 sm:p-6 md:p-8 flex flex-col gap-6 bg-white overflow-y-auto">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-[#4A443F] text-white text-[10px] rounded uppercase font-extrabold tracking-wider">
                    PARÂMETROS DA PEÇA
                  </span>
                  <button 
                    onClick={() => setShowImportPdfModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FDF7F5] hover:bg-[#F9EFEA] text-[#C15E3F] rounded-xl text-xs font-bold transition-all border border-[#C15E3F]/30 shadow-xs cursor-pointer"
                    title="Subir PDF de pedido anterior para recarregar todas as peças"
                    id="btn-open-pdf-import"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir PDF Anterior</span>
                  </button>
                </div>
                <h2 className="text-xl font-bold text-[#4A443F] tracking-tight mb-1">Configurar Nova Peça</h2>
                <p className="text-xs text-[#8A847C]">Insira as dimensões exatas de fabricação (incluindo alças, bicos, pés e saliências).</p>
              </div>

              {/* Step 1: Name and Firing Type Selection */}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#8A847C] block mb-1.5">Identificação / Nome da Peça</label>
                  <input 
                    type="text" 
                    value={pecaNome}
                    onChange={(e) => setPecaNome(e.target.value)}
                    placeholder="Ex: Vaso Cônico, Prato de Sobremesa, Caneca"
                    className="w-full p-2.5 bg-[#FDFDFD] border border-[#E2DED0] rounded-xl text-sm focus:border-[#C15E3F] focus:ring-1 focus:ring-[#C15E3F] outline-none"
                    id="input-piece-name"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 pt-0.5 sm:grid sm:grid-cols-5 scrollbar-none" id="firing-options-container">
                  <button 
                    onClick={() => {
                      setTipoQueima('biscoito');
                      setMetodoQueima('ajuste_inteligente');
                    }}
                    className={`flex-shrink-0 w-[130px] sm:w-auto flex flex-col p-2 rounded-lg text-left transition-all border cursor-pointer ${tipoQueima === 'biscoito' ? 'border-[#C15E3F] bg-[#FDF7F5]/50 ring-1 ring-[#C15E3F]/10 shadow-sm' : 'border-[#E2DED0]/80 bg-white hover:border-[#8A847C] hover:bg-[#FAF9F6]'}`}
                    id="btn-select-biscoito"
                  >
                    <div className="flex justify-between items-center w-full mb-0.5">
                      <span className={`text-[8px] uppercase tracking-wider font-semibold ${tipoQueima === 'biscoito' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`}>Opção 01</span>
                      <Flame className={`w-3 h-3 ${tipoQueima === 'biscoito' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`} />
                    </div>
                    <span className="text-xs font-bold text-[#4A443F]">Biscoito</span>
                    <span className="text-[9px] text-[#8A847C] mt-0.5 leading-snug">Lenta até 1000ºC. Por m³ ou fornada.</span>
                  </button>

                  <button 
                    onClick={() => {
                      setTipoQueima('esmalte');
                      setMetodoQueimaEsmalte('ajuste_inteligente');
                    }}
                    className={`flex-shrink-0 w-[130px] sm:w-auto flex flex-col p-2 rounded-lg text-left transition-all border cursor-pointer ${tipoQueima === 'esmalte' ? 'border-[#C15E3F] bg-[#FDF7F5]/50 ring-1 ring-[#C15E3F]/10 shadow-sm' : 'border-[#E2DED0]/80 bg-white hover:border-[#8A847C] hover:bg-[#FAF9F6]'}`}
                    id="btn-select-esmalte"
                  >
                    <div className="flex justify-between items-center w-full mb-0.5">
                      <span className={`text-[8px] uppercase tracking-wider font-semibold ${tipoQueima === 'esmalte' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`}>Opção 02</span>
                      <Sparkles className={`w-3 h-3 ${tipoQueima === 'esmalte' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`} />
                    </div>
                    <span className="text-xs font-bold text-[#4A443F]">Esmalte</span>
                    <span className="text-[9px] text-[#8A847C] mt-0.5 leading-snug">Alta Temp (1240ºC). Requer prateleira.</span>
                  </button>

                  <button 
                    onClick={() => {
                      setTipoQueima('ambas');
                      setMetodoQueima('ajuste_inteligente');
                      setMetodoQueimaEsmalte('ajuste_inteligente');
                    }}
                    className={`flex-shrink-0 w-[130px] sm:w-auto flex flex-col p-2 rounded-lg text-left transition-all border cursor-pointer ${tipoQueima === 'ambas' ? 'border-[#C15E3F] bg-[#FDF7F5]/50 ring-1 ring-[#C15E3F]/10 shadow-sm' : 'border-[#E2DED0]/80 bg-white hover:border-[#8A847C] hover:bg-[#FAF9F6]'}`}
                    id="btn-select-ambas"
                  >
                    <div className="flex justify-between items-center w-full mb-0.5">
                      <span className={`text-[8px] uppercase tracking-wider font-semibold ${tipoQueima === 'ambas' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`}>Opção 03</span>
                      <div className="flex gap-0.5">
                        <Flame className={`w-3 h-3 ${tipoQueima === 'ambas' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`} />
                        <Sparkles className={`w-3 h-3 ${tipoQueima === 'ambas' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#4A443F]">Ambas</span>
                    <span className="text-[9px] text-[#8A847C] mt-0.5 leading-snug">Biscoito + Esmalte. Soma final.</span>
                  </button>

                  <button 
                    onClick={() => {
                      setTipoQueima('monoqueima');
                      setMetodoQueima('ajuste_inteligente');
                    }}
                    className={`flex-shrink-0 w-[130px] sm:w-auto flex flex-col p-2 rounded-lg text-left transition-all border cursor-pointer ${tipoQueima === 'monoqueima' ? 'border-[#C15E3F] bg-[#FDF7F5]/50 ring-1 ring-[#C15E3F]/10 shadow-sm' : 'border-[#E2DED0]/80 bg-white hover:border-[#8A847C] hover:bg-[#FAF9F6]'}`}
                    id="btn-select-monoqueima"
                  >
                    <div className="flex justify-between items-center w-full mb-0.5">
                      <span className={`text-[8px] uppercase tracking-wider font-semibold ${tipoQueima === 'monoqueima' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`}>Opção 04</span>
                      <Sparkles className={`w-3 h-3 ${tipoQueima === 'monoqueima' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`} />
                    </div>
                    <span className="text-xs font-bold text-[#4A443F]">Monoqueima</span>
                    <span className="text-[9px] text-[#8A847C] mt-0.5 leading-snug">Cru + Esmalte (1240ºC). Meio/inteiro.</span>
                  </button>

                  <button 
                    onClick={() => {
                      setTipoQueima('terceira_queima');
                      setMetodoQueima('fornada_inteira');
                    }}
                    className={`flex-shrink-0 w-[130px] sm:w-auto flex flex-col p-2 rounded-lg text-left transition-all border cursor-pointer ${tipoQueima === 'terceira_queima' ? 'border-[#C15E3F] bg-[#FDF7F5]/50 ring-1 ring-[#C15E3F]/10 shadow-sm' : 'border-[#E2DED0]/80 bg-white hover:border-[#8A847C] hover:bg-[#FAF9F6]'}`}
                    id="btn-select-terceira-queima"
                  >
                    <div className="flex justify-between items-center w-full mb-0.5">
                      <span className={`text-[8px] uppercase tracking-wider font-semibold ${tipoQueima === 'terceira_queima' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`}>Opção 05</span>
                      <Sparkles className={`w-3 h-3 ${tipoQueima === 'terceira_queima' ? 'text-[#C15E3F]' : 'text-[#8A847C]'}`} />
                    </div>
                    <span className="text-xs font-bold text-[#4A443F]">3ª Queima</span>
                    <span className="text-[9px] text-[#8A847C] mt-0.5 leading-snug">Baixa Temp (750ºC). Só Forno Inteiro.</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Method and Dimensions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-[#8A847C] block mb-1.5">Modalidade de Queima</label>
                    {tipoQueima === 'ambas' ? (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-[#8A847C] block mb-1">Método Biscoito</label>
                          <select 
                            value={metodoQueima}
                            onChange={(e) => setMetodoQueima(e.target.value)}
                            className="w-full p-2 bg-white border border-[#E2DED0] rounded-xl text-xs outline-none focus:border-[#C15E3F]"
                            id="select-firing-method-biscoito"
                          >
                            <option value="ajuste_inteligente">✨ Ajuste Inteligente</option>
                            <option value="compartilhada">Compartilhada (m³)</option>
                            <option value="reserva_prateleira">Prateleira Inteira (R$ 108 / R$ 135)</option>
                            <option value="meia_fornada">Meia Fornada</option>
                            <option value="fornada_inteira">Fornada Inteira (R$ 450,00)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-[#8A847C] block mb-1">Método Esmalte</label>
                          <select 
                            value={metodoQueimaEsmalte}
                            onChange={(e) => setMetodoQueimaEsmalte(e.target.value)}
                            className="w-full p-2 bg-white border border-[#E2DED0] rounded-xl text-xs outline-none focus:border-[#C15E3F]"
                            id="select-firing-method-esmalte"
                          >
                            <option value="ajuste_inteligente">✨ Ajuste Inteligente</option>
                            <option value="compartilhada">Compartilhada (m³)</option>
                            <option value="reserva_prateleira">Prateleira Inteira (R$ 130 / R$ 162,50)</option>
                            <option value="meia_fornada">Meia Fornada</option>
                            <option value="fornada_inteira">Fornada Inteira (R$ 540,00)</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <select 
                        value={tipoQueima === 'esmalte' ? metodoQueimaEsmalte : metodoQueima}
                        onChange={(e) => {
                          if (tipoQueima === 'esmalte') {
                            setMetodoQueimaEsmalte(e.target.value);
                          } else {
                            setMetodoQueima(e.target.value);
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-[#E2DED0] rounded-xl text-sm outline-none focus:border-[#C15E3F]"
                        id="select-firing-method"
                      >
                        {tipoQueima === 'biscoito' ? (
                          <>
                            <option value="ajuste_inteligente">✨ Ajuste Inteligente (Automático)</option>
                            <option value="compartilhada">Compartilhada (Por Volume m³)</option>
                            <option value="reserva_prateleira">Prateleira Inteira (10cm: R$ 108,00 | 15cm: R$ 135,00)</option>
                            <option value="meia_fornada">Meia Fornada (Até 30 cm de altura)</option>
                            <option value="fornada_inteira">Fornada Inteira (R$ 450,00)</option>
                          </>
                        ) : tipoQueima === 'monoqueima' ? (
                          <>
                            <option value="ajuste_inteligente">✨ Ajuste Inteligente (Automático)</option>
                            <option value="compartilhada">Compartilhada (Por Volume m³)</option>
                            <option value="meia_fornada">Meia Fornada (Até 30 cm de altura)</option>
                            <option value="fornada_inteira">Fornada Inteira (R$ 1.000,00)</option>
                          </>
                        ) : tipoQueima === 'esmalte' ? (
                          <>
                            <option value="ajuste_inteligente">✨ Ajuste Inteligente (Automático)</option>
                            <option value="compartilhada">Compartilhada (Por Volume m³)</option>
                            <option value="reserva_prateleira">Prateleira Inteira (10cm: R$ 130,00 | 15cm: R$ 162,50)</option>
                            <option value="meia_fornada">Meia Fornada (Até 30 cm de altura)</option>
                            <option value="fornada_inteira">Fornada Inteira (R$ 540,00)</option>
                          </>
                        ) : (
                          <>
                            <option value="fornada_inteira">Fornada Inteira (R$ 540,00 - Somente Forno Inteiro)</option>
                          </>
                        )}
                      </select>
                    )}

                    {/* Biscoito Stacking / Overlapping Control */}
                    {(tipoQueima === 'biscoito' || tipoQueima === 'ambas') && (
                      <div className="mt-3 p-3 bg-white border border-[#E2DED0] rounded-xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#C15E3F] shrink-0" />
                            <div>
                              <span className="text-xs font-bold text-[#4A443F] block">Empilhar / Sobrepor Peças no Biscoito?</span>
                              <span className="text-[10px] text-[#8A847C] block">
                                {podeSobreporBiscoito 
                                  ? '🟢 SIM: Peças de biscoito podem ser empilhadas' 
                                  : '🔴 NÃO: Peças não podem se tocar (lado a lado)'}
                              </span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                              type="checkbox" 
                              checked={podeSobreporBiscoito} 
                              onChange={(e) => setPodeSobreporBiscoito(e.target.checked)}
                              className="sr-only peer"
                              id="toggle-pode-sobrepor-biscoito"
                            />
                            <div className="w-9 h-5 bg-[#E2DED0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C15E3F]"></div>
                          </label>
                        </div>

                        {!podeSobreporBiscoito && (
                          <div className="p-2 bg-[#FDF7F5] border border-[#C15E3F]/30 rounded-lg flex items-start gap-1.5 text-[10.5px] text-[#C15E3F] leading-snug">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              Sem empilhamento, cada peça ocupará seu espaço individual nas prateleiras. O orçamento cobrará o valor proporcional pelas prateleiras inteiras necessárias (1/4, 2/4, 3/4 ou Fornada Inteira).
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Visual indicator of Smart Adjustment resolution */}
                    {((tipoQueima === 'biscoito' || tipoQueima === 'monoqueima' || tipoQueima === 'ambas') && metodoQueima === 'ajuste_inteligente') ||
                     ((tipoQueima === 'esmalte' || tipoQueima === 'ambas') && metodoQueimaEsmalte === 'ajuste_inteligente') ? (
                      <div className="mt-2.5 p-3 bg-gradient-to-br from-[#FDF7F5] to-[#F2EFE9] border border-[#C15E3F]/25 rounded-xl text-xs space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-1.5 text-[#C15E3F] font-bold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Ajuste Inteligente Ativo</span>
                        </div>
                        <p className="text-[#8A847C] text-[11px] leading-relaxed">
                          O sistema organizará as peças automaticamente nas prateleiras buscando o melhor aproveitamento e o menor preço possível.
                        </p>
                        <div className="grid grid-cols-1 gap-1.5 pt-1 border-t border-[#E2DED0]/50 text-[11px]">
                          {(tipoQueima === 'biscoito' || tipoQueima === 'monoqueima' || tipoQueima === 'ambas') && metodoQueima === 'ajuste_inteligente' && (
                            <div className="flex justify-between items-center bg-white/70 px-2 py-1 rounded">
                              <span className="text-[#8A847C]">{tipoQueima === 'monoqueima' ? 'Monoqueima' : 'Biscoito'} ({altura}cm):</span>
                              <span className="font-bold text-[#4A443F] uppercase">
                                {resolveSmartMethod(tipoQueima === 'ambas' ? 'biscoito' : tipoQueima, altura) === 'compartilhada' ? 'Queima Compartilhada (m³)' : 
                                 resolveSmartMethod(tipoQueima === 'ambas' ? 'biscoito' : tipoQueima, altura) === 'reserva_prateleira' ? (altura <= 10 ? 'Prateleira 10cm (R$ 108,00)' : 'Prateleira 15cm (R$ 135,00)') :
                                 resolveSmartMethod(tipoQueima === 'ambas' ? 'biscoito' : tipoQueima, altura) === 'meia_fornada' ? 'Meia Fornada' : 'Fornada Inteira'}
                              </span>
                            </div>
                          )}
                          {(tipoQueima === 'esmalte' || tipoQueima === 'ambas') && metodoQueimaEsmalte === 'ajuste_inteligente' && (
                            <div className="flex justify-between items-center bg-white/70 px-2 py-1 rounded">
                              <span className="text-[#8A847C]">Esmalte ({altura}cm):</span>
                              <span className="font-bold text-[#4A443F] uppercase">
                                {resolveSmartMethod('esmalte', altura) === 'reserva_prateleira' ? (altura <= 10 ? 'Prateleira 10cm (R$ 130,00)' : 'Prateleira 15cm (R$ 162,50)') : 
                                 resolveSmartMethod('esmalte', altura) === 'meia_fornada' ? 'Meia Fornada' : 'Fornada Inteira'}
                              </span>
                            </div>
                          )}
                          <div className="text-[10px] text-[#8A847C] italic leading-tight pt-1">
                            {tipoQueima === 'esmalte' || tipoQueima === 'monoqueima' || tipoQueima === 'terceira_queima' || tipoQueima === 'ambas' ? (
                              <span className="block">⚠️ {tipoQueima === 'monoqueima' ? 'Monoqueima' : tipoQueima === 'terceira_queima' ? 'Terceira queima' : 'Esmalte'} requer espaçamento de segurança (peças não podem se encostar!).</span>
                            ) : null}
                            {tipoQueima === 'biscoito' || tipoQueima === 'ambas' ? (
                              <span className="block mt-0.5">🟢 Biscoito permite empilhar (otimização de prateleira ativa).</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {isFornadaInteira ? (
                    <div className="p-3.5 bg-gradient-to-br from-[#FDF7F5] to-[#F2EFE9] border border-[#C15E3F]/30 rounded-xl text-xs space-y-2.5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[#C15E3F] font-bold">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>Fornada Inteira Selecionada</span>
                        </div>
                        <span className="text-xs font-bold bg-[#C15E3F] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                          {tipoQueima === 'ambas' 
                            ? 'R$ 990,00 Total'
                            : tipoQueima === 'biscoito' 
                            ? 'R$ 450,00' 
                            : tipoQueima === 'esmalte' || tipoQueima === 'terceira_queima'
                            ? 'R$ 540,00'
                            : 'R$ 1.000,00'}
                        </span>
                      </div>

                      <p className="text-[#8A847C] text-[11px] leading-relaxed">
                        Cobrança referente à capacidade total do forno (195L / 163L úteis). Dimensões individuais das peças ocultadas nesta modalidade.
                      </p>

                      <div className="bg-white/80 backdrop-blur-xs rounded-lg p-2.5 border border-[#E2DED0]/60 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A847C] block mb-1">
                          Valores por Tipo (Fornada Inteira):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                          <div className={`p-1.5 rounded flex justify-between items-center border ${tipoQueima === 'biscoito' ? 'bg-[#FDF7F5] border-[#C15E3F] font-bold text-[#C15E3F]' : 'bg-[#FAF9F6] border-[#E2DED0] text-[#4A443F]'}`}>
                            <span>Biscoito:</span>
                            <span className="font-mono font-semibold">R$ 450,00</span>
                          </div>
                          <div className={`p-1.5 rounded flex justify-between items-center border ${tipoQueima === 'esmalte' ? 'bg-[#FDF7F5] border-[#C15E3F] font-bold text-[#C15E3F]' : 'bg-[#FAF9F6] border-[#E2DED0] text-[#4A443F]'}`}>
                            <span>Esmalte:</span>
                            <span className="font-mono font-semibold">R$ 540,00</span>
                          </div>
                          <div className={`p-1.5 rounded flex justify-between items-center border ${tipoQueima === 'ambas' ? 'bg-[#FDF7F5] border-[#C15E3F] font-bold text-[#C15E3F]' : 'bg-[#FAF9F6] border-[#E2DED0] text-[#4A443F]'}`}>
                            <span>Ambas:</span>
                            <span className="font-mono font-semibold">R$ 990,00</span>
                          </div>
                          <div className={`p-1.5 rounded flex justify-between items-center border ${tipoQueima === 'monoqueima' ? 'bg-[#FDF7F5] border-[#C15E3F] font-bold text-[#C15E3F]' : 'bg-[#FAF9F6] border-[#E2DED0] text-[#4A443F]'}`}>
                            <span>Monoqueima:</span>
                            <span className="font-mono font-semibold">R$ 1.000,00</span>
                          </div>
                          <div className={`p-1.5 rounded flex justify-between items-center border ${tipoQueima === 'terceira_queima' ? 'bg-[#FDF7F5] border-[#C15E3F] font-bold text-[#C15E3F]' : 'bg-[#FAF9F6] border-[#E2DED0] text-[#4A443F]'}`}>
                            <span>3ª Queima:</span>
                            <span className="font-mono font-semibold">R$ 540,00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-bold uppercase text-[#8A847C] block mb-1.5">Dimensões Máximas (cm)</label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] text-[#8A847C] block text-center font-bold">Altura</span>
                          <input 
                            type="number" 
                            value={altura || ''}
                            onChange={(e) => setAltura(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full p-2 border border-[#E2DED0] rounded-lg text-sm text-center outline-none focus:border-[#C15E3F]"
                            placeholder="cm"
                            min="1"
                            id="input-height"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-[#8A847C] block text-center font-bold">Largura</span>
                          <input 
                            type="number" 
                            value={largura || ''}
                            onChange={(e) => setLargura(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full p-2 border border-[#E2DED0] rounded-lg text-sm text-center outline-none focus:border-[#C15E3F]"
                            placeholder="cm"
                            min="1"
                            id="input-width"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-[#8A847C] block text-center font-bold">Profundidade</span>
                          <input 
                            type="number" 
                            value={profundidade || ''}
                            onChange={(e) => setProfundidade(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full p-2 border border-[#E2DED0] rounded-lg text-sm text-center outline-none focus:border-[#C15E3F]"
                            placeholder="cm"
                            min="1"
                            id="input-depth"
                          />
                        </div>
                      </div>
                      {isPartialFornadaInteira && (
                        <p className="mt-1.5 text-[10px] text-[#C15E3F] font-medium">
                          💡 As dimensões acima serão aplicadas apenas à modalidade com cálculo por volume/prateleira.
                        </p>
                      )}
                      {dimensionError && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{dimensionError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Optional Technical details space */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold uppercase text-[#8A847C] block">Ficha Técnica da Argila/Esmalte</label>
                      {isGlazeOrMono && (
                        <span className="text-[9px] bg-[#C15E3F]/10 text-[#C15E3F] px-2 py-0.5 rounded-full font-bold uppercase border border-[#C15E3F]/20">
                          Obrigatório
                        </span>
                      )}
                    </div>
                    {!isGlazeOrMono && (
                      <button 
                        onClick={() => setIncluirDetalhes(!incluirDetalhes)}
                        className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold transition-colors cursor-pointer ${incluirDetalhes ? 'bg-[#C15E3F] text-white' : 'bg-[#F2EFE9] text-[#4A443F]'}`}
                        id="btn-toggle-tech-details"
                      >
                        {incluirDetalhes ? 'Ocultar' : 'Habilitar'}
                      </button>
                    )}
                  </div>

                  <div className={`border border-[#E2DED0] rounded-xl p-3 bg-[#FDFDFD] space-y-3 transition-opacity duration-200 ${incluirDetalhes ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-[#8A847C] uppercase font-bold">Nacionalidade Argila</span>
                        <select 
                          value={nacionalidadeMassa}
                          onChange={(e) => setNacionalidadeMassa(e.target.value)}
                          className="w-full p-1 bg-transparent border-b border-[#F0EEE8] text-xs outline-none focus:border-[#C15E3F]"
                          id="select-clay-origin"
                        >
                          <option value="Nacional">Nacional</option>
                          <option value="Importada">Importada</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8A847C] uppercase font-bold">Fabricante da Argila</span>
                        <input 
                          type="text" 
                          placeholder="Ex: Pascoal, Argilas Brasil"
                          value={marcaMassa}
                          onChange={(e) => setMarcaMassa(e.target.value)}
                          className="w-full p-1 bg-transparent border-b border-[#F0EEE8] text-xs outline-none focus:border-[#C15E3F]"
                          id="input-clay-brand"
                        />
                      </div>
                    </div>

                    {isGlazeOrMono && (
                      <>
                        <div>
                          <span className="text-[9px] text-[#8A847C] uppercase font-bold block mb-0.5">Temp. Máxima da Argila (ºC)</span>
                          <input 
                            type="number" 
                            value={tempMaximaQueima || ''}
                            onChange={(e) => setTempMaximaQueima(parseInt(e.target.value) || 0)}
                            className="w-full p-1 bg-transparent border-b border-[#F0EEE8] text-xs outline-none focus:border-[#C15E3F]"
                            placeholder="Ex: 1300"
                            id="input-clay-temp"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F0EEE8]">
                          <div>
                            <span className="text-[9px] text-[#8A847C] uppercase font-bold">Tipo Esmalte</span>
                            <select 
                              value={tipoEsmalte}
                              onChange={(e) => setTipoEsmalte(e.target.value as any)}
                              className="w-full p-1 bg-transparent border-b border-[#F0EEE8] text-xs outline-none focus:border-[#C15E3F]"
                              id="select-glaze-type"
                            >
                              <option value="estavel">Estável</option>
                              <option value="reagente">Reagente</option>
                              <option value="mate">Mate</option>
                              <option value="acetinado">Acetinado</option>
                              <option value="brilho">Brilho</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#8A847C] uppercase font-bold">Marca Esmalte</span>
                            <input 
                              type="text" 
                              placeholder="Ex: Flavia, Shino"
                              value={marcaEsmalte}
                              onChange={(e) => setMarcaEsmalte(e.target.value)}
                              className="w-full p-1 bg-transparent border-b border-[#F0EEE8] text-xs outline-none focus:border-[#C15E3F]"
                              id="input-glaze-brand"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-[#8A847C] uppercase font-bold">Camadas</span>
                            <input 
                              type="number" 
                              value={quantasCamadas || ''}
                              onChange={(e) => setQuantasCamadas(parseInt(e.target.value) || 0)}
                              className="w-full p-1 bg-transparent border-b border-[#F0EEE8] text-xs outline-none"
                              placeholder="Ex: 2"
                              id="input-glaze-coats"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-[#8A847C] uppercase font-bold">Temp. Máx Esmalte</span>
                            <input 
                              type="number" 
                              value={tempMaximaEsmalte || ''}
                              onChange={(e) => setTempMaximaEsmalte(parseInt(e.target.value) || 0)}
                              className="w-full p-1 bg-transparent border-b border-[#F0EEE8] text-xs outline-none"
                              placeholder="Ex: 1240"
                              id="input-glaze-temp"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <button 
                onClick={handleAddPiece}
                disabled={!!dimensionError || altura <= 0 || largura <= 0 || profundidade <= 0}
                className="w-full py-3 bg-[#C15E3F] text-white rounded-xl font-bold text-sm shadow-md shadow-[#C15E3F]/20 hover:bg-[#a64e32] active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                id="btn-add-piece"
              >
                <Plus className="w-4 h-4" />
                Adicionar Peça ao Orçamento
              </button>

              {/* Dynamic Warning Boxes based on business logic */}
              <div className="space-y-2">
                {tipoQueima === 'biscoito' && (
                  <div className="p-3 bg-[#FDF7F5] border-l-3 border-[#C15E3F] rounded-r-lg text-[11px] text-[#4A443F] leading-relaxed">
                    <strong>Regras de Biscoito:</strong> Peças altas (acima de 15cm e até 30cm) requerem <strong>Meia Fornada</strong> para acomodação. Peças maiores que 30cm requerem contratação de <strong>Fornada Inteira</strong> obrigatória.
                  </div>
                )}
                {tipoQueima === 'esmalte' && (
                  <div className="p-3 bg-amber-50 border-l-3 border-amber-500 rounded-r-lg text-[11px] text-[#785C3A] leading-relaxed">
                    <strong>Regras de Esmalte (Alta Temp 1240ºC):</strong> Peças esmaltadas nunca podem se encostar para evitar fusão. Cobrança por nível de prateleira (10cm ou 15cm). Alturas entre 15cm e 30cm requerem <strong>Meia Fornada</strong>, e acima de 30cm requerem <strong>Fornada Inteira</strong>.
                  </div>
                )}
              </div>
            </section>

            {/* Right: Summary & Action Panel */}
            <section className="flex-1 p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col justify-between bg-[#F2EFE9] overflow-y-auto">
              <div className="space-y-6">
                
                {/* Visualizer card for current items */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-[#4A443F]/5 border border-white relative">
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-[#C15E3F] rounded-full flex items-center justify-center text-white shadow-md">
                    <Flame className="w-5 h-5" />
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8A847C]">Resumo do Orçamento</h3>
                    <button 
                      onClick={() => setShowImportPdfModal(true)}
                      className="text-xs font-bold text-[#C15E3F] hover:underline flex items-center gap-1 cursor-pointer"
                      id="btn-open-pdf-import-summary"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir PDF</span>
                    </button>
                  </div>

                  {/* List of current pieces */}
                  <div className="space-y-3 mb-6 max-h-[220px] overflow-y-auto pr-1">
                    {piecesList.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm font-semibold text-[#8A847C]">Nenhuma peça no orçamento.</p>
                        <p className="text-[11px] text-[#8A847C] mt-1 mb-3">Configure as dimensões à esquerda e adicione peças.</p>
                        <button 
                          onClick={() => setShowImportPdfModal(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FDF7F5] border border-[#C15E3F]/30 text-[#C15E3F] rounded-xl text-xs font-bold hover:bg-[#F9EFEA] transition-colors cursor-pointer"
                        >
                          <FileUp className="w-3.5 h-3.5" />
                          <span>Importar PDF de Pedido Anterior</span>
                        </button>
                      </div>
                    ) : (
                      piecesWithAdjustedCosts.map((p) => {
                        if (editingPieceId === p.id) {
                          return (
                            <div key={p.id} className="p-3 bg-[#FAF9F6] border border-[#C15E3F] rounded-xl space-y-2.5 my-1 shadow-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-[#C15E3F] uppercase tracking-wider">Editar Peça</span>
                                <span className="text-[9px] px-1.5 py-0.2 bg-[#F2EFE9] rounded text-[#8A847C] font-semibold uppercase">
                                  {p.tipo}
                                </span>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#4A443F] block mb-0.5">Nome da Peça</label>
                                <input 
                                  type="text" 
                                  value={editPieceName}
                                  onChange={(e) => setEditPieceName(e.target.value)}
                                  className="w-full text-xs font-bold p-1.5 bg-white border border-[#E2DED0] rounded-lg focus:outline-none focus:border-[#C15E3F]"
                                  placeholder="Nome da peça"
                                  id={`input-edit-nome-${p.id}`}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#4A443F] block mb-0.5">Dimensões (AxLxP em cm)</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <div>
                                    <span className="text-[9px] text-[#8A847C] block">Alt (cm)</span>
                                    <input 
                                      type="number" 
                                      step="0.1"
                                      min="0"
                                      value={editPieceAltura}
                                      onChange={(e) => setEditPieceAltura(parseFloat(e.target.value) || 0)}
                                      className="w-full text-xs font-mono font-bold p-1 bg-white border border-[#E2DED0] rounded focus:outline-none focus:border-[#C15E3F]"
                                      id={`input-edit-alt-${p.id}`}
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-[#8A847C] block">Larg (cm)</span>
                                    <input 
                                      type="number" 
                                      step="0.1"
                                      min="0"
                                      value={editPieceLargura}
                                      onChange={(e) => setEditPieceLargura(parseFloat(e.target.value) || 0)}
                                      className="w-full text-xs font-mono font-bold p-1 bg-white border border-[#E2DED0] rounded focus:outline-none focus:border-[#C15E3F]"
                                      id={`input-edit-larg-${p.id}`}
                                    />
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-[#8A847C] block">Prof (cm)</span>
                                    <input 
                                      type="number" 
                                      step="0.1"
                                      min="0"
                                      value={editPieceProfundidade}
                                      onChange={(e) => setEditPieceProfundidade(parseFloat(e.target.value) || 0)}
                                      className="w-full text-xs font-mono font-bold p-1 bg-white border border-[#E2DED0] rounded focus:outline-none focus:border-[#C15E3F]"
                                      id={`input-edit-prof-${p.id}`}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end gap-1.5 pt-1">
                                <button 
                                  onClick={handleCancelEditPiece}
                                  className="px-2.5 py-1 bg-white border border-[#E2DED0] hover:bg-[#F2EFE9] text-[#4A443F] text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                                  id={`btn-cancel-edit-${p.id}`}
                                >
                                  Cancelar
                                </button>
                                <button 
                                  onClick={() => handleSaveEditPiece(p.id)}
                                  className="px-3 py-1 bg-[#C15E3F] text-white text-[11px] font-bold rounded-lg hover:bg-[#a64e32] transition-colors cursor-pointer flex items-center gap-1"
                                  id={`btn-save-edit-${p.id}`}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Salvar</span>
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={p.id} className="flex justify-between items-center border-b border-[#F0EEE8] pb-2.5">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[#4A443F]">{p.nome}</span>
                                <span className="text-[9px] px-1.5 py-0.2 bg-[#F2EFE9] rounded text-[#8A847C] font-semibold uppercase">
                                  {p.tipo}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#8A847C]">
                                {p.metodo === 'fornada_inteira' || (p.altura === 0 && p.largura === 0 && p.profundidade === 0)
                                  ? 'Fornada Inteira (Capacidade total)'
                                  : `${p.altura}x${p.largura}x${p.profundidade}cm • ${p.metodo.replace('_', ' ')}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-[#4A443F]">
                                R$ {p.custoCalculado.toFixed(2)}
                              </span>
                              <button 
                                onClick={() => handleStartEditPiece(p)}
                                className="text-[#C15E3F] hover:text-[#a64e32] p-1 rounded hover:bg-[#FDF7F5] transition-colors cursor-pointer"
                                title="Editar nome ou tamanho"
                                id={`btn-edit-${p.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleRemovePiece(p.id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remover peça"
                                id={`btn-remove-${p.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Real Occupancy Report Details */}
                  {piecesList.length > 0 && (
                    <div className="border-t border-[#E2DED0] pt-4 pb-2 space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#C15E3F]">
                        Relatório Técnico de Ocupação Real
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-[#4A443F]">
                        <div className="flex justify-between border-b border-dashed border-[#E2DED0] pb-1">
                          <span className="text-[#8A847C]">Volume Total das Peças:</span>
                          <span className="font-semibold font-mono">{orcamentoDetalhado.volumeTotalGeometricoL.toFixed(3)} L</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-[#E2DED0] pb-1">
                          <span className="text-[#8A847C]">Volume Real Ocupado:</span>
                          <span className="font-semibold font-mono">{orcamentoDetalhado.volumeEfetivoOcupadoL.toFixed(3)} L</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-[#E2DED0] pb-1">
                          <span className="text-[#8A847C]">Ocupação Útil do Forno:</span>
                          <span className="font-semibold font-mono">{orcamentoDetalhado.porcentagemOcupacaoForno.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-[#E2DED0] pb-1">
                          <span className="text-[#8A847C]">Prateleiras Utilizadas:</span>
                          <span className="font-semibold">{orcamentoDetalhado.qtdPrateleiras}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-[#E2DED0] pb-1">
                          <span className="text-[#8A847C]">Altura Ocupada no Forno:</span>
                          <span className="font-semibold font-mono">{orcamentoDetalhado.alturaOcupadaCm} cm</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-[#E2DED0] pb-1">
                          <span className="text-[#8A847C]">Níveis de Prateleira:</span>
                          <span className="font-semibold">{orcamentoDetalhado.qtdNiveisEstimada}</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-[#FDF7F5] rounded-lg border border-[#F0EEE8] text-[11px] space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[#8A847C] font-semibold shrink-0">Modalidade de Cobrança:</span>
                          <span className="font-bold text-[#C15E3F] text-right">{orcamentoDetalhado.modalidadeCobranca}</span>
                        </div>

                        {orcamentoDetalhado.pisoAplicado && (
                          <div className="pt-2 border-t border-[#C15E3F]/20 text-[10.5px] text-[#4A443F] space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-[#C15E3F]">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Proteção de Custo do Ateliê (Piso por Prateleira)</span>
                            </div>
                            <p className="text-[#8A847C] leading-snug">
                              As peças ocuparam <strong>{orcamentoDetalhado.qtdPrateleiras} prateleira(s)</strong> ({orcamentoDetalhado.qtdPrateleiras}/4 da capacidade total do forno). O valor final aplica a fração proporcional justa ({orcamentoDetalhado.qtdPrateleiras}/4 do forno) para cobrir o custo de reserva física do espaço no forno.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Total pricing calculation details */}
                  {piecesList.length > 0 && (
                    <div className="border-t border-[#E2DED0] pt-4 space-y-2">
                      <div className="flex justify-between items-end pt-2">
                        <span className="text-sm font-bold text-[#4A443F]">Total Estimado</span>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-[#C15E3F] block">
                            R$ {totalOrcamento.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WhatsApp & PDF Export Tools */}
                  {piecesList.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-[#F0EEE8] space-y-3">
                      {/* Runny Glaze acceptance terms for Esmalte */}
                      {piecesList.some(p => p.tipo === 'esmalte' || p.tipo === 'monoqueima' || p.tipo === 'terceira_queima') && (
                        <label className="flex items-start gap-2 p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg text-[10px] text-[#785C3A] cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={aceitouDanosEsmalte}
                            onChange={(e) => setAceitouDanosEsmalte(e.target.checked)}
                            className="mt-0.5 rounded text-[#C15E3F] focus:ring-[#C15E3F]"
                            id="checkbox-terms"
                          />
                          <span>
                            Estou ciente de que esmaltes escorridos podem danificar as placas refratárias e concordo em arcar com custos de reparo/substituição caso ocorra.
                          </span>
                        </label>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          onClick={handleSendWhatsApp}
                          className="flex flex-col sm:flex-row items-center justify-center gap-1 py-2 bg-[#25D366] text-white rounded-lg font-bold text-[10px] sm:text-xs shadow-md shadow-[#25D366]/10 hover:bg-[#1ebd57] active:scale-95 transition-all cursor-pointer text-center"
                          id="btn-whatsapp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        <button 
                          onClick={handleSendEmail}
                          className="flex flex-col sm:flex-row items-center justify-center gap-1 py-2 bg-[#C15E3F] text-white rounded-lg font-bold text-[10px] sm:text-xs shadow-md shadow-[#C15E3F]/10 hover:bg-[#a14b30] active:scale-95 transition-all cursor-pointer text-center"
                          id="btn-email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>E-mail</span>
                        </button>
                        <button 
                          onClick={handleGeneratePDF}
                          className="flex flex-col sm:flex-row items-center justify-center gap-1 py-2 bg-[#4A443F] text-white rounded-lg font-bold text-[10px] sm:text-xs hover:bg-[#3d3732] active:scale-95 transition-all cursor-pointer text-center"
                          id="btn-pdf"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Gerar PDF</span>
                        </button>
                      </div>

                      {/* Gemini Assistant Smart Evaluation tool button */}
                      <button 
                        onClick={handleGeminiAnalysis}
                        disabled={isAnalyzingTech}
                        className="w-full py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 text-purple-700 hover:from-purple-100 hover:to-indigo-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                        id="btn-ai-analyze"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                        {isAnalyzingTech ? 'Analisando Compatibilidade...' : 'Consultar Inteligência Artificial (Compatibilidade)'}
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={handleCopyClipboard}
                          className="flex items-center justify-center gap-1.5 py-1.5 border border-[#E2DED0] hover:bg-[#F9F8F6] rounded-lg text-[10px] uppercase font-bold text-[#4A443F] cursor-pointer"
                          id="btn-copy"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar Texto
                        </button>

                        <button 
                          onClick={handleSaveOrderToCloud}
                          disabled={savingOrder}
                          className="flex items-center justify-center gap-1.5 py-1.5 bg-[#C15E3F] text-white hover:bg-[#a64e32] rounded-lg text-[10px] uppercase font-bold cursor-pointer"
                          id="btn-cloud-save"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          {savingOrder ? 'Salvando...' : 'Salvar na Nuvem'}
                        </button>
                      </div>

                      {/* Expandable Technical Terms Card */}
                      <div className="mt-2 border border-[#E2DED0] rounded-xl overflow-hidden bg-[#FAF9F6]">
                        <button 
                          onClick={() => setShowTermosTecnicos(!showTermosTecnicos)}
                          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                          id="btn-toggle-termos"
                        >
                          <div className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-[#C15E3F]" />
                            <span className="text-xs font-bold text-[#4A443F]">OBSERVAÇÕES E TERMOS TÉCNICOS</span>
                          </div>
                          <span className="text-[10px] text-[#C15E3F] font-semibold">
                            {showTermosTecnicos ? 'Ocultar' : 'Ver Todos (10 itens)'}
                          </span>
                        </button>

                        {showTermosTecnicos && (
                          <div className="p-3 pt-2 border-t border-[#E2DED0] text-[11px] text-[#4A443F] space-y-2 bg-white max-h-60 overflow-y-auto">
                            <p>• As medidas consideradas são sempre as dimensões máximas da peça, incluindo alças, bicos, pés e saliências.</p>
                            <p>• O acondicionamento das peças no forno é de responsabilidade técnica exclusiva do Ateliê Ollaria Cerâmica, visando o melhor aproveitamento do espaço e a segurança da queima.</p>
                            <p>• Na queima de esmalte, o espaçamento técnico de segurança entre as peças é indispensável para evitar fusão e danos.</p>
                            <p>• As temperaturas de referência utilizadas pelo ateliê são:<br/>
                              <span className="pl-3 block font-medium">- Queima de biscoito: aproximadamente 1.000 °C;</span>
                              <span className="pl-3 block font-medium">- Queima de esmalte e monoqueima: aproximadamente 1.240 °C.</span>
                            </p>
                            <p>• Todo forno cerâmico apresenta pequenas variações naturais de temperatura entre diferentes regiões da câmara de queima. Essas diferenças são inerentes ao processo cerâmico e não caracterizam falha do equipamento nem responsabilidade do ateliê.</p>
                            <p>• Caso o cliente deseje acompanhamento por cones pirométricos, deverá solicitá-lo previamente. Os cones são cobrados por unidade utilizada, e o serviço de acompanhamento e leitura possui cobrança adicional.</p>
                            <p>• Peças destinadas à queima de esmalte passam por avaliação técnica quanto à compatibilidade da argila, esmalte e temperatura de queima. O ateliê poderá recusar peças que apresentem risco ao forno ou às demais peças da fornada.</p>
                            <p>• Caso o esmalte escorra e provoque danos às prateleiras, placas, suportes ou demais componentes do forno, o cliente será responsável pelos custos de limpeza, reparo ou substituição dos materiais danificados.</p>
                            <p>• O processo cerâmico envolve riscos inerentes, como trincas, rachaduras, empenamentos, deformações, bolhas, pinholes, variações de cor, diferenças de textura e outras alterações decorrentes da secagem, da formulação dos esmaltes, da argila ou da compatibilidade entre materiais. Tais ocorrências fazem parte da natureza da cerâmica e não caracterizam responsabilidade do ateliê.</p>
                            <p>• O Ateliê Ollaria Cerâmica é responsável pela correta condução do processo de queima, não podendo garantir resultados estéticos ou técnicos decorrentes da construção da peça, da qualidade da argila, da aplicação de esmaltes ou da compatibilidade entre os materiais utilizados pelo cliente.</p>
                          </div>
                        )}
                      </div>

                      {copiedMessage && (
                        <p className="text-center text-xs text-[#25D366] font-semibold">{copiedMessage}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Kiln Shelf Auto-Optimizer Visualizer */}
                <KilnOptimizer piecesList={piecesList} podeSobreporBiscoito={podeSobreporBiscoito} />

                {/* Gemini Technical opinion card when loaded */}
                {geminiRelatorio && (
                  <div className="bg-gradient-to-br from-white to-[#FAF9FF] p-6 rounded-2xl border-2 border-purple-100 shadow-md">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1 bg-purple-100 text-purple-700 rounded-lg">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-xs text-purple-950 uppercase tracking-wider">Laudo de Viabilidade Técnica (IA)</h4>
                    </div>
                    <p className="text-xs text-[#4A443F] leading-relaxed mb-4 italic">
                      "{geminiRelatorio.relatorioGeral}"
                    </p>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {geminiRelatorio.analises.map((an, i) => (
                        <div key={i} className="bg-white p-3 rounded-lg border border-purple-50 text-xs">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="font-bold text-purple-900">{an.nome}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${an.resultado.includes('Aprovado') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                              {an.resultado}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-1"><strong>Compatibilidade:</strong> {an.avaliacao}</p>
                          <p className="text-red-700 mb-1"><strong>Riscos:</strong> {an.riscos}</p>
                          <p className="text-indigo-950"><strong>Recomendação:</strong> {an.conselhoTecnico}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Information guidelines */}
                <div className="flex flex-col sm:flex-row gap-6 text-[10px] text-[#8A847C] uppercase tracking-wider">
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="font-bold text-[#4A443F] flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-[#C15E3F]" />
                      Acondicionamento Técnico
                    </span>
                    <span>O carregamento do forno, disposição das placas refratárias e controle de rampa é de responsabilidade exclusiva do ateliê.</span>
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="font-bold text-[#4A443F] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Danos e Substituição
                    </span>
                    <span>Danos graves causados por fusions ou esmalte escorrendo geram cobrança de taxa de substituição de prateleiras.</span>
                  </div>
                </div>

              </div>
            </section>
          </>
        )}

        {/* TAB 2: MEUS PEDIDOS / HISTÓRICO */}
        {activeTab === 'historico' && (
          <section className="flex-1 p-4 sm:p-6 md:p-8 lg:p-12 bg-white overflow-y-auto w-full">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#4A443F] tracking-tight mb-1">Meus Orçamentos na Nuvem</h2>
                <p className="text-sm text-[#8A847C]">Acompanhe o andamento da queima e o status de aprovação de cada peça de forma segura.</p>
              </div>

              {allOrders.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[#E2DED0] rounded-2xl bg-[#F9F8F6]">
                  <Flame className="w-12 h-12 text-[#8A847C] mx-auto mb-3 opacity-40" />
                  <p className="text-base font-semibold text-[#4A443F]">Nenhum orçamento salvo na nuvem ainda.</p>
                  <p className="text-xs text-[#8A847C] mt-1 max-w-sm mx-auto">
                    Faça cálculos na calculadora e clique em "Salvar na Nuvem" para armazenar seus dados e receber atualizações em tempo real.
                  </p>
                  <button 
                    onClick={() => setActiveTab('orcamento')}
                    className="mt-4 px-4 py-2 bg-[#C15E3F] text-white rounded-xl text-xs font-bold hover:bg-[#a64e32]"
                  >
                    Ir para Calculadora
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {allOrders.map((order) => (
                    <div key={order.id} className="border border-[#E2DED0] rounded-xl p-4 sm:p-6 bg-[#FDFDFD] shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#F2EFE9] mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#4A443F]">Pedido #{order.id}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              order.status === 'concluido' ? 'bg-green-50 text-green-700 border border-green-200' :
                              order.status === 'queimando' ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' :
                              order.status === 'aprovado' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              order.status === 'em_analise' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {order.status === 'pendente' && 'Aguardando Avaliação'}
                              {order.status === 'em_analise' && 'Em Análise Técnica'}
                              {order.status === 'aprovado' && 'Aprovado'}
                              {order.status === 'queimando' && 'No Forno (Em Queima)'}
                              {order.status === 'concluido' && 'Concluído (Disponível)'}
                              {order.status === 'cancelado' && 'Cancelado'}
                            </span>
                          </div>
                          <span className="text-xs text-[#8A847C]">
                            Criado em: {new Date(order.dataCriacao).toLocaleDateString('pt-BR')} às {new Date(order.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-[#8A847C] block">Total</span>
                          <span className="text-lg font-bold text-[#C15E3F] font-mono">R$ {order.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Pieces in this order */}
                      <div className="space-y-3">
                        {order.pecas.map((p, idx) => (
                          <div key={idx} className="bg-[#F9F8F6] p-3 rounded-xl border border-[#F0EEE8] text-xs">
                            <div className="flex justify-between items-start mb-1.5">
                              <div>
                                <span className="font-bold text-[#4A443F]">{p.nome}</span>
                                <span className="ml-2 px-1.5 py-0.2 bg-[#E2DED0] text-[#4A443F] rounded text-[9px] uppercase font-bold">
                                  {p.tipo}
                                </span>
                              </div>
                              <span className="font-mono text-[#8A847C]">R$ {p.custoCalculado.toFixed(2)}</span>
                            </div>
                            <p className="text-[#8A847C] text-[11px]">
                              Medidas: {p.altura}x{p.largura}x{p.profundidade}cm • Modalidade: {p.metodo.replace('_', ' ')}
                            </p>
                            {p.detalhesTecnicos && (
                              <div className="mt-2 pt-1.5 border-t border-[#E2DED0] text-[10px] text-[#8A847C] grid grid-cols-2 gap-2">
                                <div>
                                  <strong>Massa:</strong> {p.detalhesTecnicos.marcaMassa} ({p.detalhesTecnicos.nacionalidadeMassa}) | Máx: {p.detalhesTecnicos.tempMaximaQueima}ºC
                                </div>
                                {(p.tipo === 'esmalte' || p.tipo === 'monoqueima' || p.tipo === 'terceira_queima') && (
                                  <div>
                                    <strong>Esmalte:</strong> {p.detalhesTecnicos.tipoEsmalte} ({p.detalhesTecnicos.marcaEsmalte}) | {p.detalhesTecnicos.quantasCamadas} Camadas
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Export Options inside My Orders */}
                      <div className="mt-4 flex gap-2 justify-end flex-wrap">
                        <button 
                          onClick={() => {
                            // Temporary load list to generate PDF/WhatsApp for this historic order
                            setPiecesList(order.pecas);
                            setTimeout(() => {
                              handleGeneratePDF();
                            }, 100);
                          }}
                          className="px-3 py-1.5 border border-[#E2DED0] hover:bg-[#F9F8F6] text-xs font-bold text-[#4A443F] rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          id={`btn-order-pdf-${order.id}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Gerar PDF
                        </button>
                        <button 
                          onClick={() => {
                            setPiecesList(order.pecas);
                            setTimeout(() => {
                              handleSendEmail();
                            }, 100);
                          }}
                          className="px-3 py-1.5 bg-[#C15E3F] text-white hover:bg-[#a14b30] text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          id={`btn-order-mail-${order.id}`}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Enviar E-mail
                        </button>
                        <button 
                          onClick={() => {
                            setPiecesList(order.pecas);
                            setTimeout(() => {
                              handleSendWhatsApp();
                            }, 100);
                          }}
                          className="px-3 py-1.5 bg-[#25D366] text-white hover:bg-[#1ebd57] text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          id={`btn-order-wa-${order.id}`}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Enviar WhatsApp
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: ADMIN PAINEL DE CONTROLE */}
        {activeTab === 'admin' && currentUser?.isAdmin && (
          <section className="flex-1 p-4 sm:p-6 md:p-8 lg:p-12 bg-white overflow-y-auto w-full">
            <div className="max-w-6xl mx-auto space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[#4A443F] tracking-tight mb-1">Painel de Controle do Ateliê</h2>
                <p className="text-sm text-[#8A847C]">Gerencie as queimas e envie notificações automáticas sobre o andamento físico de cada peça.</p>
              </div>

              {/* Stats Grid Dashboard */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-[#FDF7F5] border border-orange-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#8A847C]">Receita Total Estimada</span>
                  <p className="text-2xl font-bold text-[#C15E3F] mt-1 font-mono">R$ {adminStats.totalRevenue.toFixed(2)}</p>
                  <p className="text-[10px] text-[#8A847C] mt-1">Excluindo cancelamentos</p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#8A847C]">Aguardando Análise</span>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{adminStats.countPendente}</p>
                  <p className="text-[10px] text-[#8A847C] mt-1">Apenas pedidos pendentes</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#8A847C]">Em Queima no Forno</span>
                  <p className="text-2xl font-bold text-red-700 mt-1">{adminStats.countQueimando}</p>
                  <p className="text-[10px] text-[#8A847C] mt-1">Status: Fornando ativo</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-[#8A847C]">Concluídos e Prontos</span>
                  <p className="text-2xl font-bold text-green-700 mt-1">{adminStats.countConcluido}</p>
                  <p className="text-[10px] text-[#8A847C] mt-1">Disponíveis para retirada</p>
                </div>
              </div>

              {/* Recharts Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <div className="bg-[#F9F8F6] p-5 rounded-2xl border border-[#E2DED0]">
                  <h3 className="text-xs font-bold uppercase text-[#4A443F] mb-4">Volume de Pedidos por Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={adminStats.statusData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <ReChartsTooltip />
                        <Bar dataKey="value" name="Pedidos">
                          {adminStats.statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#F9F8F6] p-5 rounded-2xl border border-[#E2DED0]">
                  <h3 className="text-xs font-bold uppercase text-[#4A443F] mb-4">Avisos Importantes do Sistema</h3>
                  <div className="space-y-3 text-xs leading-relaxed text-[#4A443F]">
                    <div className="p-3 bg-white border border-[#E2DED0] rounded-lg">
                      <strong className="text-[#C15E3F] block mb-1">Capacidade do Forno:</strong>
                      O forno de 195 litros comporta até 5 níveis de 10cm de altura ou 4 níveis de 15cm. Monitore o espaçamento de segurança de 2 cm nas prateleiras esmaltadas.
                    </div>
                    <div className="p-3 bg-white border border-[#E2DED0] rounded-lg">
                      <strong className="text-[#C15E3F] block mb-1">Responsabilidade Técnica:</strong>
                      Peças reagentes geram risco de escoamento. Verifique sempre se o pé da peça foi completamente limpo de esmalte antes do carregamento.
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders List for Admins */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h3 className="text-base font-bold text-[#4A443F]">Fila Geral de Pedidos</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8A847C]">Filtrar Status:</span>
                    <select 
                      value={adminFilterStatus}
                      onChange={(e) => setAdminFilterStatus(e.target.value)}
                      className="p-1.5 bg-white border border-[#E2DED0] rounded-lg text-xs"
                      id="select-admin-filter"
                    >
                      <option value="todos">Todos</option>
                      <option value="pendente">Aguardando Avaliação</option>
                      <option value="em_analise">Em Análise Técnica</option>
                      <option value="aprovado">Aprovados</option>
                      <option value="queimando">No Forno (Queima)</option>
                      <option value="concluido">Concluídos</option>
                      <option value="cancelado">Cancelados</option>
                    </select>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <p className="text-center py-10 text-xs text-[#8A847C] border border-[#E2DED0] rounded-xl bg-[#F9F8F6]">Nenhum pedido encontrado para o filtro selecionado.</p>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div key={order.id} className="border border-[#E2DED0] rounded-xl p-4 bg-[#FDFDFD] shadow-sm">
                        <div className="flex flex-wrap justify-between items-center pb-2.5 border-b border-[#F2EFE9] mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#4A443F] text-xs sm:text-sm">Cliente: {order.clienteNome} ({order.clienteEmail})</span>
                              <span className="text-[10px] bg-[#F2EFE9] px-2 py-0.5 rounded text-[#8A847C] font-semibold">Pedido #{order.id}</span>
                            </div>
                            <span className="text-[10px] text-[#8A847C]">Data: {new Date(order.dataCriacao).toLocaleDateString('pt-BR')} às {new Date(order.dataCriacao).toLocaleTimeString('pt-BR')}</span>
                          </div>

                          <div className="flex items-center gap-3 mt-2 sm:mt-0">
                            <div className="text-right">
                              <span className="text-[11px] font-bold text-[#C15E3F] font-mono block">R$ {order.total.toFixed(2)}</span>
                            </div>
                            {/* Action to update status */}
                            <select 
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className="p-1 border border-[#E2DED0] rounded text-xs bg-white font-semibold cursor-pointer"
                              id={`select-status-${order.id}`}
                            >
                              <option value="pendente">Aguardando Avaliação</option>
                              <option value="em_analise">Em Análise Técnica</option>
                              <option value="aprovado">Aprovado p/ Queima</option>
                              <option value="queimando">No Forno</option>
                              <option value="concluido">Concluído</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </div>
                        </div>

                        {/* Pieces details in admin view */}
                        <div className="space-y-2">
                          {order.pecas.map((p, idx) => (
                            <div key={idx} className="p-2 bg-[#F9F8F6] rounded border border-[#E2DED0] text-xs flex justify-between items-center">
                              <div>
                                <span className="font-bold text-[#4A443F]">{p.nome}</span>
                                <span className="ml-1.5 text-[9px] px-1.5 py-0.2 bg-[#E2DED0] rounded uppercase font-bold text-[#4A443F]">
                                  {p.tipo}
                                </span>
                                <span className="ml-2 text-[#8A847C]">
                                  {p.altura}x{p.largura}x{p.profundidade}cm • Modalidade: {p.metodo.replace('_', ' ')}
                                </span>
                              </div>
                              {p.detalhesTecnicos && (
                                <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                                  Argila: {p.detalhesTecnicos.marcaMassa} • {p.detalhesTecnicos.tempMaximaQueima}ºC
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-[#E2DED0] shadow-2xl p-6 max-w-sm w-full space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-[#4A443F]">
                {authMode === 'login' ? 'Acessar Conta' : 'Criar Nova Conta'}
              </h3>
              <p className="text-xs text-[#8A847C] mt-1">
                {authMode === 'login' 
                  ? 'Faça login para salvar seus orçamentos cerâmicos na nuvem.' 
                  : 'Registre-se para iniciar seu monitoramento profissional de queimas.'}
              </p>
            </div>

            {authError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg font-semibold">{authError}</p>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'register' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-[#8A847C] block mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={authNome}
                    onChange={(e) => setAuthNome(e.target.value)}
                    required
                    className="w-full p-2 border border-[#E2DED0] rounded-xl text-xs outline-none focus:border-[#C15E3F]"
                    id="auth-nome"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase text-[#8A847C] block mb-1">Endereço de E-mail</label>
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  placeholder="ex: ceramista@email.com"
                  className="w-full p-2 border border-[#E2DED0] rounded-xl text-xs outline-none focus:border-[#C15E3F]"
                  id="auth-email"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[#8A847C] block mb-1">Senha de Acesso</label>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full p-2 border border-[#E2DED0] rounded-xl text-xs outline-none focus:border-[#C15E3F]"
                  id="auth-password"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-[#C15E3F] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#a64e32] transition-colors cursor-pointer"
                id="auth-submit"
              >
                {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>

            <div className="text-center pt-2">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs text-[#C15E3F] hover:underline font-semibold cursor-pointer"
                id="auth-toggle-mode"
              >
                {authMode === 'login' ? 'Não tem conta? Cadastre-se aqui' : 'Já possui conta? Faça login'}
              </button>
            </div>


          </div>
        </div>
      )}

      {/* Import PDF/Text Modal */}
      {showImportPdfModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-[#E2DED0] shadow-2xl p-6 max-w-xl w-full space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#E2DED0] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#C15E3F]/10 text-[#C15E3F] rounded-lg">
                    <FileUp className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold text-[#4A443F]">Importar Pedido ou Colar Orçamento</h3>
                </div>
                <p className="text-xs text-[#8A847C] mt-1">
                  Recarregue automaticamente todas as peças e dimensões colando a mensagem do WhatsApp/texto ou enviando o PDF de um orçamento anterior.
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowImportPdfModal(false);
                  setParsedPiecesPreview([]);
                  setPdfParseError(null);
                  setPdfParseSuccessMsg(null);
                  setPastedText('');
                }}
                className="text-[#8A847C] hover:text-[#4A443F] p-1 rounded-lg hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                id="btn-close-pdf-import-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs (Text / PDF) */}
            <div className="flex bg-[#FAF9F6] p-1 rounded-xl border border-[#E2DED0]">
              <button
                onClick={() => {
                  setImportTab('text');
                  setPdfParseError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  importTab === 'text'
                    ? 'bg-white text-[#C15E3F] shadow-xs border border-[#E2DED0]'
                    : 'text-[#8A847C] hover:text-[#4A443F]'
                }`}
                id="tab-import-text"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Colar Texto / Mensagem</span>
              </button>
              <button
                onClick={() => {
                  setImportTab('pdf');
                  setPdfParseError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  importTab === 'pdf'
                    ? 'bg-white text-[#C15E3F] shadow-xs border border-[#E2DED0]'
                    : 'text-[#8A847C] hover:text-[#4A443F]'
                }`}
                id="tab-import-pdf"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Arquivo PDF</span>
              </button>
            </div>

            {/* Tab 1: Paste Text Content */}
            {importTab === 'text' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#4A443F]">
                    Cole a mensagem copiada do orçamento anterior:
                  </label>
                  <button
                    onClick={handlePasteFromClipboard}
                    className="text-xs font-bold text-[#C15E3F] hover:underline flex items-center gap-1 cursor-pointer"
                    id="btn-paste-clipboard"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Colar Automaticamente</span>
                  </button>
                </div>

                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    setPdfParseError(null);
                  }}
                  placeholder="Cole aqui a mensagem inteira do WhatsApp ou do resumo (ex: 1. Vaso - Medidas: 20x15x15 cm...)"
                  className="w-full h-36 p-3 text-xs bg-[#FAF9F6] border border-[#E2DED0] rounded-xl focus:outline-none focus:border-[#C15E3F] font-mono"
                  id="textarea-paste-quote"
                />

                <button
                  onClick={() => handleProcessTextMessage(pastedText)}
                  disabled={isParsingPdf || !pastedText.trim()}
                  className="w-full py-2.5 bg-[#C15E3F] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#a64e32] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  id="btn-parse-text-quote"
                >
                  {isParsingPdf ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Interpretando Texto e Extraindo Peças...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Interpretar Texto e Carregar Peças</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab 2: Dropzone / PDF File Picker */}
            {importTab === 'pdf' && (
              <div className="space-y-4">
                <label 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleProcessPdfFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isParsingPdf ? 'border-[#C15E3F] bg-[#FDF7F5] animate-pulse' : 'border-[#E2DED0] bg-[#FAF9F6] hover:border-[#C15E3F] hover:bg-[#FDF7F5]/50'
                  }`}
                  id="pdf-dropzone-label"
                >
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProcessPdfFile(e.target.files[0]);
                      }
                    }}
                    className="hidden" 
                    id="pdf-upload-input"
                  />

                  {isParsingPdf ? (
                    <div className="py-2 flex flex-col items-center gap-2">
                      <Sparkles className="w-8 h-8 text-[#C15E3F] animate-spin" />
                      <p className="text-xs font-bold text-[#4A443F]">Lendo e extraindo itens do PDF...</p>
                      <p className="text-[11px] text-[#8A847C]">Analisando metadados digitais e especificações técnicas.</p>
                    </div>
                  ) : (
                    <div className="py-2 flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-[#F2EFE9] flex items-center justify-center text-[#C15E3F]">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#4A443F]">Clique para selecionar ou arraste o PDF aqui</p>
                        <p className="text-[10px] text-[#8A847C] mt-0.5">Suporta orçamentos gerados pelo Ollaria Ateliê (.pdf)</p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            )}

            {/* Error and Success Feedback Messages */}
            {pdfParseError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-semibold" id="pdf-parse-error-box">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{pdfParseError}</span>
              </div>
            )}

            {pdfParseSuccessMsg && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-xs text-green-800 font-semibold" id="pdf-parse-success-box">
                <CheckCircle className="w-4 h-4 shrink-0 text-green-600" />
                <span>{pdfParseSuccessMsg}</span>
              </div>
            )}

            {/* Preview List of extracted items */}
            {parsedPiecesPreview.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#E2DED0]">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#4A443F]">
                    Peças Identificadas ({parsedPiecesPreview.length})
                  </h4>
                  <button 
                    onClick={() => {
                      if (selectedPreviewIds.size === parsedPiecesPreview.length) {
                        setSelectedPreviewIds(new Set());
                      } else {
                        setSelectedPreviewIds(new Set(parsedPiecesPreview.map(p => p.id)));
                      }
                    }}
                    className="text-[11px] font-semibold text-[#C15E3F] hover:underline cursor-pointer"
                    id="btn-toggle-all-preview-pieces"
                  >
                    {selectedPreviewIds.size === parsedPiecesPreview.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                  </button>
                </div>

                <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 border border-[#E2DED0] rounded-xl p-2 bg-[#FAF9F6]">
                  {parsedPiecesPreview.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => toggleSelectPreviewPiece(item.id)}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        selectedPreviewIds.has(item.id) 
                          ? 'bg-white border-[#C15E3F] shadow-sm' 
                          : 'bg-[#F2EFE9]/60 border-[#E2DED0] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="checkbox"
                          checked={selectedPreviewIds.has(item.id)}
                          onChange={() => toggleSelectPreviewPiece(item.id)}
                          className="rounded text-[#C15E3F] focus:ring-[#C15E3F] cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-[#4A443F]">{item.nome}</p>
                          <p className="text-[10px] text-[#8A847C]">
                            Medidas: {item.altura}x{item.largura}x{item.profundidade}cm • Tipo: {item.tipo.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-[#F2EFE9] text-[#4A443F] px-2 py-0.5 rounded font-semibold uppercase">
                        {item.metodo.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions to confirm import */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button 
                    onClick={() => handleConfirmImport('append')}
                    disabled={selectedPreviewIds.size === 0}
                    className="flex-1 py-2.5 bg-[#C15E3F] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#a64e32] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                    id="btn-confirm-import-append"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar {selectedPreviewIds.size} {selectedPreviewIds.size === 1 ? 'Peça' : 'Peças'} ao Orçamento
                  </button>
                  {piecesList.length > 0 && (
                    <button 
                      onClick={() => handleConfirmImport('replace')}
                      disabled={selectedPreviewIds.size === 0}
                      className="py-2.5 px-4 bg-[#4A443F] text-white rounded-xl text-xs font-bold hover:bg-[#38332f] transition-colors disabled:opacity-50 cursor-pointer"
                      id="btn-confirm-import-replace"
                    >
                      Substituir Peças Atuais
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Status Bar matching the Geometric Balance Theme */}
      <footer className="h-10 bg-[#4A443F] text-white text-[10px] flex items-center justify-between px-4 sm:px-8 uppercase tracking-[0.2em] shrink-0">
        <div className="flex gap-4">
          <span>Ollaria Ateliê</span>
        </div>
        <div className="flex gap-4 items-center">
          <span>v2.4.0 • Cloud Synced</span>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
        </div>
      </footer>
    </div>
  );
}
