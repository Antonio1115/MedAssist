// clearcare-frontend/src/pages/HistoryPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/index.jsx';
import Layout from '../components/Layout.jsx';

function HistoryPage() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIds, setExpandedIds] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const token = await user.getIdToken();

        const res = await fetch('http://localhost:4000/api/summaries?limit=50', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch summaries');
        }

        const data = await res.json();
        setSummaries(data.summaries || []);
      } catch (err) {
        console.error(err);
        setError('Could not load your conversation history.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getPreview = (text, length = 100) => {
    if (!text) return '';
    return text.length > length ? text.slice(0, length) + '...' : text;
  };

  let content;

  if (loading) {
    content = <div className="p-4 text-gray-600">Loading history...</div>;
  } else if (error) {
    content = <div className="p-4 text-red-600">{error}</div>;
  } else if (summaries.length === 0) {
    content = (
      <div className="p-4 text-gray-600">
        You don’t have any saved summaries yet. Try using the Medical Assistance page first.
      </div>
    );
  } else {
    content = (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-semibold mb-2">Conversation History</h1>

        <div className="space-y-3">
          {summaries.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            return (
              <div
                key={item.id}
                className="border rounded-lg p-3 shadow-sm bg-white flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </button>
                </div>

                {/* Preview line */}
                {!isExpanded && (
                  <p className="text-sm text-gray-600 italic">
                    {getPreview(item.original_text, 100)}
                  </p>
                )}

                {isExpanded && (
                  <>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">
                        Original instructions
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {item.original_text}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">
                        MedAssist summary
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {item.summary_text}
                      </p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return <Layout>{content}</Layout>;
}

export default HistoryPage;
