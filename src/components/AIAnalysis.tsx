import React from 'react';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisProps {
  analysis: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    icdCodes: string[];
    keyTerms: string[];
  } | null;
  isLoading: boolean;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ analysis, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center py-8">
          {/* AI Processing Animation */}
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          
          {/* Processing Status */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Generating Medical Analysis
            </h3>
            <p className="text-gray-600 text-sm">
              AI is analyzing the consultation and creating structured medical notes...
            </p>
          </div>

          {/* Progress Steps */}
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700">Processing transcript</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <span className="text-sm text-gray-700">Extracting medical information</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
              <span className="text-sm text-gray-700">Structuring SOAP notes</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
              <span className="text-sm text-gray-700">Identifying ICD codes</span>
            </div>
          </div>

          {/* Estimated Time */}
          <div className="mt-6 text-xs text-gray-500 text-center">
            This usually takes 10-30 seconds
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    console.log('AIAnalysis: analysis prop is null');
    return null;
  }
  
  console.log('AIAnalysis: Rendering with analysis:', analysis);

  const exportToFile = () => {
    if (!analysis) return;
    
    const content = `MEDICAL CONSULTATION NOTES
${new Date().toLocaleString()}

SUBJECTIVE:
${analysis.subjective}

OBJECTIVE:
${analysis.objective}

ASSESSMENT:
${analysis.assessment}

PLAN:
${analysis.plan}

ICD-10 CODES:
${analysis.icdCodes.join('\n')}

KEY MEDICAL TERMS:
${analysis.keyTerms.join('\n')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-notes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Medical Notes</h2>
        <button
          onClick={exportToFile}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Export Notes
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Subjective Section */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <h3 className="font-bold text-blue-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Subjective
          </h3>
          <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown 
              components={{
                p: ({children}) => <p className="mb-2">{children}</p>,
                strong: ({children}) => <span className="font-semibold text-blue-900">{children}</span>
              }}
            >
              {analysis.subjective}
            </ReactMarkdown>
          </div>
        </div>

        {/* Objective Section */}
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
          <h3 className="font-bold text-green-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
            </svg>
            Objective
          </h3>
          <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown 
              components={{
                p: ({children}) => <p className="mb-2">{children}</p>,
                strong: ({children}) => <span className="font-semibold text-green-900">{children}</span>
              }}
            >
              {analysis.objective}
            </ReactMarkdown>
          </div>
        </div>

        {/* Assessment Section */}
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
          <h3 className="font-bold text-orange-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Assessment
          </h3>
          <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown 
              components={{
                p: ({children}) => <p className="mb-2">{children}</p>,
                strong: ({children}) => <span className="font-semibold text-orange-900">{children}</span>
              }}
            >
              {analysis.assessment}
            </ReactMarkdown>
          </div>
        </div>

        {/* Plan Section */}
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
          <h3 className="font-bold text-purple-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
            </svg>
            Plan
          </h3>
          <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown 
              components={{
                p: ({children}) => <p className="mb-2">{children}</p>,
                strong: ({children}) => <span className="font-semibold text-purple-900">{children}</span>
              }}
            >
              {analysis.plan}
            </ReactMarkdown>
          </div>
        </div>

        {/* ICD-10 Codes Section */}
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <h3 className="font-bold text-red-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
            </svg>
            ICD-10 Codes
          </h3>
          <div className="grid gap-2">
            {analysis.icdCodes.map((code, index) => (
              <div key={index} className="bg-white border border-red-200 rounded-md p-3 text-sm">
                <span className="font-mono text-red-700 font-semibold">{code}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Medical Terms Section */}
        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg">
          <h3 className="font-bold text-indigo-800 text-lg mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.94l1-4H9.03z" clipRule="evenodd"/>
            </svg>
            Key Medical Terms
          </h3>
          <div className="flex flex-wrap gap-2">
            {analysis.keyTerms.map((term, index) => (
              <span key={index} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium border border-indigo-200">
                {term}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysis;
