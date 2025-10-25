export function navigate(page: string, params?: Record<string, any>) {
  try {
    if (params?.financeiroModo) localStorage.setItem('peperaio_financeiro_modo', params.financeiroModo);
    if (params?.financeiroSelectedDate) localStorage.setItem('peperaio_financeiro_selected_date', params.financeiroSelectedDate);
    if (params?.financeiroSelectedMonth) localStorage.setItem('peperaio_financeiro_selected_month', params.financeiroSelectedMonth);
  } catch {}
  const ev = new CustomEvent('peperaio_navigate', { detail: { page, params } });
  window.dispatchEvent(ev);
}
