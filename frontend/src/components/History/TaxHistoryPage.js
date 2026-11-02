
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { taxAPI } from '../../utils/api';

const formatMoney = value =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0
  })}`;

const formatDate = value =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Date unavailable';

export default function TaxHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const nav = useNavigate();

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data } = await taxAPI.history();
      setHistory(data.history || []);
    } catch (err) {
      toast.error(
        err.response?.data?.error || 'Failed to load tax history.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const deleteRecord = async id => {
    if (!window.confirm('Delete this tax calculation record?')) {
      return;
    }

    try {
      setDeleting(id);
      await taxAPI.deleteHistory(id);
      setHistory(prev => prev.filter(item => item._id !== id));
      toast.success('Tax calculation deleted.');
    } catch (err) {
      toast.error(
        err.response?.data?.error || 'Failed to delete record.'
      );
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60vh'
      }}>
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">📊 Tax Calculation History</div>
          <div className="page-sub">
            {history.length} saved calculation
            {history.length !== 1 ? 's' : ''}
          </div>
        </div>

        <button
          className="btn btn-accent btn-sm"
          onClick={() => nav('/calculator')}
        >
          + New Calculation
        </button>
      </div>

      <div className="page-body">
        {history.length === 0 ? (
          <div className="card" style={{
            textAlign: 'center',
            padding: '60px 24px'
          }}>
            <div style={{
              fontSize: '52px',
              marginBottom: '16px'
            }}>
              🧾
            </div>

            <h3 style={{
              fontSize: '18px',
              marginBottom: '10px',
              fontFamily: 'Outfit,sans-serif'
            }}>
              No Tax Calculations Yet
            </h3>

            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              Your saved tax calculations will appear here.
            </p>

            <button
              className="btn btn-accent"
              onClick={() => nav('/calculator')}
            >
              Calculate Your Tax
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '18px'
          }}>
            {history.map(record => {
              const oldTax = record.oldRegime?.totalTax || 0;
              const newTax = record.newRegime?.totalTax || 0;

              const recommended =
                record.recommendedRegime ||
                (oldTax < newTax
                  ? 'old'
                  : oldTax > newTax
                    ? 'new'
                    : 'equal');

              return (
                <div
                  className="card"
                  key={record._id}
                  style={{ padding: '20px' }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '17px',
                        fontWeight: 700
                      }}>
                        {record.taxYear}
                      </div>

                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        marginTop: '5px'
                      }}>
                        {formatDate(record.createdAt)}
                      </div>
                    </div>

                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteRecord(record._id)}
                      disabled={deleting === record._id}
                      title="Delete calculation"
                    >
                      {deleting === record._id ? '...' : '🗑️'}
                    </button>
                  </div>

                  <div style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '14px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      marginBottom: '5px'
                    }}>
                      Gross Annual Income
                    </div>

                    <div style={{
                      fontSize: '22px',
                      fontWeight: 700
                    }}>
                      {formatMoney(record.grossIncome)}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    marginBottom: '14px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)'
                      }}>
                        Old Regime
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        marginTop: '5px'
                      }}>
                        {formatMoney(oldTax)}
                      </div>
                    </div>

                    <div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)'
                      }}>
                        New Regime
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        marginTop: '5px'
                      }}>
                        {formatMoney(newTax)}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    borderTop: '1px solid var(--border)',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)'
                    }}>
                      Recommended Regime
                    </span>

                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      textTransform: 'uppercase'
                    }}>
                      {recommended === 'equal'
                        ? 'Both Equal'
                        : recommended}
                    </span>
                  </div>

                  <div style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: 'var(--text-muted)'
                  }}>
                    Residential status: {record.residentialStatus || 'resident'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
