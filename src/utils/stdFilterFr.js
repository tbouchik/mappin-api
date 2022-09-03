const stdFilterFr = [
  {
    value: 'Date',
    type: 'DATE',
    isImputable: false,
    tags: ['Date de la commande', 'Date de facture'],
    role: ['INVOICE', 'DATE_REF'],
  },
  {
    value: 'Référence Facture',
    type: 'TEXT',
    isImputable: false,
    tags: ['ref', 'réference'],
    role: ['INVOICE', 'INVOICE_REF'],
  },
  {
    type: 'DATE',
    value: 'Date Échéance',
    isImputable: false,
    tags: [],
    role: ['INVOICE', 'DUE_DATE'],
  },
  {
    type: 'TEXT',
    value: 'Méthode Paiement',
    isImputable: false,
    tags: [],
    role: ['INVOICE', 'PAYMENT_TERMS'],
  },
  {
    value: 'Taxes',
    type: 'NUMBER',
    isImputable: true,
    tags: ['TVA'],
    role: ['INVOICE', 'VAT'],
  },
  {
    type: 'NUMBER',
    value: 'Total ',
    isImputable: true,
    tags: ['Facture totale', 'Solde dû', 'total TTC'],
    role: ['INVOICE', 'TOTAL_TTC'],
  },
];

module.exports = stdFilterFr;
