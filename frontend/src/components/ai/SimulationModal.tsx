// frontend/src/components/ai/SimulationModal.tsx
import React, { useState } from 'react';
import { X, Play } from 'lucide-react';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: any[];
  connections: any[];
}

const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  nodes,
  connections
}) => {
  const [simulationInput, setSimulationInput] = useState('');
  const [simulationResult, setSimulationResult] = useState('');

  if (!isOpen) return null;

  const runSimulation = () => {
    if (!simulationInput.trim()) {
      alert('Please enter a message to simulate');
      return;
    }

    const input = simulationInput.toLowerCase();
    
    // Find matching transitions in nodes
    let response = '';
    let matchedTransition = null;
    
    for (const node of nodes) {
      if (node.data.transitions) {
        for (const transition of node.data.transitions) {
          if (input.includes(transition.toLowerCase())) {
            matchedTransition = transition;
            // Find connected node
            const connection = connections.find(conn => 
              conn.from === node.id && conn.transition === transition
            );
            if (connection) {
              const targetNode = nodes.find(n => n.id === connection.to);
              if (targetNode) {
                response = targetNode.data.message || `Response for ${transition}`;
                break;
              }
            }
          }
        }
        if (matchedTransition) break;
      }
    }

    if (!response) {
      // Default welcome response
      const welcomeNode = nodes.find(n => n.type === 'welcome');
      response = welcomeNode ? welcomeNode.data.message : 'Hello! How can I help you today?';
    }

    setSimulationResult(`User: "${simulationInput}"\n\nAI Response: "${response}"\n\nMatched: ${matchedTransition || 'Welcome flow'}`);
  };

  const clearSimulation = () => {
    setSimulationInput('');
    setSimulationResult('');
  };

  const getTestExamples = () => {
    const examples = [];
    nodes.filter(n => n.data.transitions).forEach(node => {
      node.data.transitions?.forEach(transition => {
        examples.push(transition);
      });
    });
    return examples;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Flow Simulation</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Message
            </label>
            <input
              type="text"
              value={simulationInput}
              onChange={(e) => setSimulationInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Type a customer message to test the flow..."
              onKeyPress={(e) => e.key === 'Enter' && runSimulation()}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={runSimulation}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Simulation
            </button>
            <button
              onClick={clearSimulation}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Clear
            </button>
          </div>

          {simulationResult && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Simulation Result
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {simulationResult}
                </pre>
              </div>
            </div>
          )}

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Test Examples</h4>
            <div className="space-y-2">
              <p className="text-xs text-blue-700 mb-2">Click to test these transitions:</p>
              <div className="flex flex-wrap gap-2">
                {getTestExamples().map((transition, index) => (
                  <button
                    key={index}
                    onClick={() => setSimulationInput(`I need ${transition}`)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    "I need {transition}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationModal;