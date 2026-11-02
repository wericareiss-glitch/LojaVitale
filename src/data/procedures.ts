import { Procedure } from '../types';

export const PROCEDURES: Procedure[] = [
  {
    id: "consulta-avaliacao",
    name: "Avaliação Facial & Corporal (Personalizada)",
    category: "facial",
    price: 100,
    duration: "45 min",
    sessions: "Avaliação diagnóstica",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=700&q=80",
    description: "Descubra o tratamento ideal para sua pele e seu corpo no conforto da sua casa. Avaliamos suas necessidades e montamos seu protocolo. (Grátis ao fechar outro procedimento!)",
    benefits: [
      "Atendimento com hora marcada na sua residência",
      "Indicação precisa do melhor tratamento para você",
      "Maca confortável e descartáveis hospitalares inclusos",
      "O valor de R$ 100 vira desconto no seu carrinho ao agendar outro serviço"
    ]
  },
  {
    id: "enzimas-lipoliticas",
    name: "Seca Barriga & Queima de Gordura Localizada",
    category: "injetaveis",
    price: 170,
    duration: "50 min",
    sessions: "Sessão com enzimas ativas",
    image: "https://images.unsplash.com/photo-1512290900672-1f02e646271a?auto=format&fit=crop&w=700&q=80",
    description: "Redução de gordura localizada sem cortes e sem cirurgia. Aplicação direta onde você mais quer perder: barriga, flancos, culote, costas ou papada.",
    benefits: [
      "Afina a silhueta e quebra a gordura teimosa",
      "Sem pós-operatório ou repouso chato",
      "Resultados visíveis nas primeiras semanas",
      "Aplicação rápida, precisa e no conforto da sua casa"
    ]
  },
  {
    id: "vitaminas-injetaveis",
    name: "Shot de Energia & Imunidade (Vitaminas Injetáveis)",
    category: "injetaveis",
    price: 90,
    duration: "40 min",
    sessions: "Aplicação rápida",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=700&q=80",
    description: "Diga adeus ao cansaço diário! Coquetel turbinado com Vitamina C, Complexo B e Biotina para aumentar sua disposição, fortalecer cabelos e unhas com absorção imediata.",
    benefits: [
      "Disposição e energia renovadas no mesmo dia",
      "100% de absorção (muito superior a cápsulas e pílulas)",
      "Fortalece a imunidade, melhora o sono, cabelos e unhas",
      "Preparado estéril sob medida para a sua sessão"
    ]
  },
  {
    id: "limpeza-pele-profunda",
    name: "Limpeza de Pele Profunda com Fototerapia LED",
    category: "facial",
    price: 170,
    duration: "75 min",
    sessions: "1 sessão completa",
    image: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=700&q=80",
    description: "Pele renovada, lisinha e livre de cravos! Higienização completa sem dor, controle de oleosidade e banho de luz LED calmante para tirar qualquer vermelhidão.",
    benefits: [
      "Eliminação profunda de cravos e impurezas dos poros",
      "Diminui os poros abertos e reduz o excesso de oleosidade",
      "Luz de LED cicatrizante que não deixa o rosto vermelho",
      "Pele macia, sedosa e com brilho natural de saúde"
    ]
  },
  {
    id: "microagulhamento-drug",
    name: "Microagulhamento Renovador (Anti-Manchas & Colágeno)",
    category: "facial",
    price: 840,
    duration: "60 min",
    sessions: "1 sessão",
    image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=700&q=80",
    description: "Tratamento potente para clarear manchinhas de sol ou espinhas, suavizar linhas de expressão e devolver o colágeno e a firmeza da pele jovem.",
    benefits: [
      "Estímulo intenso de colágeno natural da sua pele",
      "Clareia manchas de acne, melasma e manchas de sol",
      "Disfarça linhas finas e devolve a firmeza do rosto",
      "Kit de microagulhas estéril 100% descartável e individual"
    ]
  },
  {
    id: "peeling-quimico",
    name: "Peeling Facial Clareador & Renovação Celular",
    category: "facial",
    price: 670,
    duration: "45 min",
    sessions: "1 sessão",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80",
    description: "Remova a camada opaca da pele e revele um rosto jovem, sedoso e iluminado. Clareia manchas, melhora a textura e dá aquele viço de salão.",
    benefits: [
      "Clareamento gradual e seguro de manchas",
      "Toque aveludado e maciez imediata",
      "Acelera a renovação da sua pele",
      "Fórmula balanceada para o clima de Teresina"
    ]
  },
  {
    id: "drenagem-linfatica",
    name: "Drenagem Linfática Desincha & Relaxa",
    category: "corporal",
    price: 210,
    duration: "60 min",
    sessions: "1 sessão",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=700&q=80",
    description: "Massagem suave e especializada para eliminar a retenção de líquidos, desinchar o corpo todo e aliviar a sensação de peso nas pernas e abdômen.",
    benefits: [
      "Desinchaço imediato e sensação de leveza corporal",
      "Melhora a circulação e diminui a aparência da celulite",
      "Relaxamento profundo sem precisar sair da sua casa",
      "Maca ergonômica montada e óleos hidratantes inclusos"
    ]
  },
  {
    id: "hydra-gloss-lips",
    name: "Hydra Gloss Labial (Super Hidratação & Brilho)",
    category: "facial",
    price: 440,
    duration: "45 min",
    sessions: "1 sessão",
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=700&q=80",
    description: "Lábios macios, viçosos e com cor saudável natural! Infusão de ácido hialurônico e vitaminas que trata rachaduras e ressecamento sem agulhas grossas e sem dor.",
    benefits: [
      "Efeito gloss natural com lábios nutridos",
      "Acaba de vez com pelinhas e ressecamento",
      "Restaura o volume de hidratação natural",
      "Sem dor e sem alteração artificial do formato"
    ]
  }
];

export const CLINIC_CONFIG = {
  phone: "558694484292",
  displayPhone: "+55 (86) 9448-4292",
  city: "Teresina",
  state: "PI",
  name: "Vitale Concierge Estética Avançada",
};

