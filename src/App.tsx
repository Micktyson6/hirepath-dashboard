import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Users, Archive, Filter } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  email: string;
  skills: string[];
  resumeLink?: string;
  experience: number;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  active: number;
  archived: number;
  averageExperience: number;
}

const API_URL = import.meta.env.MODE === 'production' 
  ? 'https://hirepath-dashboard.onrender.com/api'
  : 'http://localhost:3001/api';

function App() {
  const [viewCandidate, setViewCandidate] = useState<Candidate | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    skills: '',
    resumeLink: '',
    experience: 0,
    notes: ''
  });

  // Fetch candidates from API with pagination
  const fetchCandidates = useCallback(async (page: number = 1, statusFilter: string = 'all') => {
    try {
      const response = await fetch(`${API_URL}/candidates?page=${page}&limit=5&status=${statusFilter}`);
      const data = await response.json();
      
      // Handle the new API response format
      setCandidates(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setCurrentPage(data.pagination?.page || 1);
      
      // Fetch stats
      const statsResponse = await fetch(`${API_URL}/candidates/stats`);
      const stats = await statsResponse.json();
      setStats(stats);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  }, []);

  useEffect(() => {
    fetchCandidates(currentPage, statusFilter);
  }, [fetchCandidates, currentPage, statusFilter]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/candidates/stats/overview`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchStats();
  }, [fetchCandidates, statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
      const payload = {
        ...formData,
        skills: skillsArray,
        experience: Number(formData.experience)
      };
      let response;
      if (editingCandidate) {
        response = await fetch(`${API_URL}/candidates/${editingCandidate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_URL}/candidates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (response.ok) {
        setShowModal(false);
        setEditingCandidate(null);
        setFormData({ name: '', email: '', skills: '', resumeLink: '', experience: 0, notes: '' });
        fetchCandidates(currentPage);
        fetchStats();
      }
    } catch (error) {
      console.error('Error saving candidate:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        await fetch(`${API_URL}/candidates/${id}`, { method: 'DELETE' });
        fetchCandidates(currentPage);
        fetchStats();
      } catch (error) {
        console.error('Error deleting candidate:', error);
      }
    }
  };

  const handleBulkAction = async (action: string, ids?: string[]) => {
    const targetIds = ids || selectedCandidates;
    if (targetIds.length === 0) return;
    try {
      await fetch(`${API_URL}/candidates/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: targetIds,
        })
      });
      setSelectedCandidates([]);
      fetchCandidates(currentPage);
      fetchStats();
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const openEditModal = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      name: candidate.name,
      email: candidate.email,
      skills: candidate.skills.join(', '),
      resumeLink: candidate.resumeLink || '',
      experience: candidate.experience,
      notes: candidate.notes || ''
    });
    setShowModal(true);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Candidate Management</h1>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Candidate</span>
              </button>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Filter Dropdown */}
          <div className="mb-6 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-blue-600" />
                  <span className="text-lg font-semibold">Total</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">{stats.total}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-green-600" />
                  <span className="text-lg font-semibold">Active</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-green-700">{stats.active}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                  <Archive className="h-6 w-6 text-gray-600" />
                  <span className="text-lg font-semibold">Archived</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-700">{stats.archived}</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center space-x-2">
                  <Filter className="h-6 w-6 text-blue-400" />
                  <span className="text-lg font-semibold">Avg Exp</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-blue-700">{stats.averageExperience.toFixed(1)} yrs</div>
              </div>
            </div>
          )}
          {/* Candidate Table */}
          {!candidates.length ? (
            <div className="bg-white p-8 rounded-lg shadow-sm flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading candidates...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.length === candidates.length && candidates.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCandidates(candidates.map(c => c.id));
                          } else {
                            setSelectedCandidates([]);
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50 cursor-pointer" onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      setViewCandidate(candidate);
                    }}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidates([...selectedCandidates, candidate.id]);
                            } else {
                              setSelectedCandidates(selectedCandidates.filter(id => id !== candidate.id));
                            }
                          }}
                          className="rounded"
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{candidate.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {candidate.skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="text-xs text-gray-500">+{candidate.skills.length - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{candidate.experience} years</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          candidate.status === 'active' ? 'bg-green-100 text-green-800' :
                          candidate.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {candidate.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(candidate); }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {candidate.status === 'active' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBulkAction('archive', [candidate.id]);
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-xs font-semibold"
                              title="Archive"
                            >
                              Archive
                            </button>
                          )}
                          {candidate.status === 'archived' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBulkAction('unarchive', [candidate.id]);
                              }}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 text-xs font-semibold"
                              title="Unarchive"
                            >
                              Unarchive
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(candidate.id); }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => fetchCandidates(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchCandidates(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{currentPage}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => fetchCandidates(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Edit/Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-5 border w-96 shadow-2xl rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Skills (comma-separated)</label>
                  <input
                    type="text"
                    required
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="React, Node.js, TypeScript"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resume Link</label>
                  <input
                    type="url"
                    value={formData.resumeLink}
                    onChange={(e) => setFormData({ ...formData, resumeLink: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Experience (years)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCandidate(null);
                      setFormData({ name: '', email: '', skills: '', resumeLink: '', experience: 0, notes: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    {editingCandidate ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Sleek Candidate Detail Card Modal */}
      {viewCandidate && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              onClick={() => setViewCandidate(null)}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600">
                {viewCandidate.name.charAt(0)}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center">{viewCandidate.name}</h2>
              <p className="text-gray-500 text-center">{viewCandidate.email}</p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {viewCandidate.skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">{skill}</span>
                ))}
              </div>
              {viewCandidate.resumeLink && (
                <a href={viewCandidate.resumeLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm mt-2">View Resume</a>
              )}
              <div className="grid grid-cols-2 gap-4 w-full mt-4">
                <div>
                  <span className="block text-xs text-gray-400">Experience</span>
                  <span className="block text-base text-gray-700 font-semibold">{viewCandidate.experience} years</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400">Status</span>
                  <span className={`block text-base font-semibold ${viewCandidate.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>{viewCandidate.status}</span>
                </div>
              </div>
              <div className="w-full mt-4">
                <span className="block text-xs text-gray-400">Notes</span>
                <span className="block text-sm text-gray-700">{viewCandidate.notes || 'N/A'}</span>
              </div>
              <div className="w-full mt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-gray-400">Created At</span>
                  <span className="block text-xs text-gray-500">{new Date(viewCandidate.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400">Updated At</span>
                  <span className="block text-xs text-gray-500">{new Date(viewCandidate.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;