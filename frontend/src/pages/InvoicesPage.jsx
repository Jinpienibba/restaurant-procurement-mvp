import { useCallback, useRef } from 'react';
import InvoiceUploadForm from '../components/InvoiceUploadForm.jsx';
import InvoiceList from '../components/InvoiceList.jsx';

export default function InvoicesPage() {
  const listRef = useRef(null);

  const handleInvoiceSuccess = useCallback(() => {
    // Refresh the invoice list after successful upload
    if (listRef.current) {
      listRef.current.load();
    }
  }, []);

  return (
    <div className="page-stack">
      <InvoiceUploadForm onSuccess={handleInvoiceSuccess} />
      <InvoiceList ref={listRef} title="All Invoices" />
    </div>
  );
}
