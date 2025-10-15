

// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { 
//   Plus, Save, Play, Settings, Trash2, Edit3, X, Check, Move, 
//   MessageSquare, Zap, Building, User, Clock, Brain, MoreHorizontal,
//   ChevronDown, Pencil
// } from 'lucide-react';
// import SimulationModal from './SimulationModal';
// // import { Save, Play } from 'lucide-react'
// import { serviceManagementService, ConversationFlow } from '../../services/serviceManagement.service'
// // import { useAuthStore
// import toast from 'react-hot-toast'
// // import toast from 'react-hot-toast'
// const FixedRetellCanvas = () => {

//   // Add these state variables inside your component:
// const [isSaving, setIsSaving] = useState(false)
// const [flowName, setFlowName] = useState('Customer Service Flow')
// const [flowDescription, setFlowDescription] = useState('')
// const [showSaveModal, setShowSaveModal] = useState(false)
// const [showSimulationModal, setShowSimulationModal] = useState(false)
//   // All state variables properly defined
//   const [nodes, setNodes] = useState([]);
//   const [connections, setConnections] = useState([]);
//   const [selectedNode, setSelectedNode] = useState(null);
//   const [isDragging, setIsDragging] = useState(null);
//   const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
//   const [isConnecting, setIsConnecting] = useState(null);
//   const [editingTransition, setEditingTransition] = useState(null);
//   const [newTransitionText, setNewTransitionText] = useState('');
//   const [editingNodeTitle, setEditingNodeTitle] = useState(null);
//   const [editingNodeMessage, setEditingNodeMessage] = useState(null);
//   const [tempValues, setTempValues] = useState({});
  
//   const canvasRef = useRef(null);

//   // Initialize with professional Retell AI structure
//   useEffect(() => {
//     if (nodes.length === 0) {
//       const retellNodes = [
//         {
//           id: 'begin-1',
//           type: 'begin',
//           x: 120,
//           y: 120,
//           data: { title: 'Begin' }
//         },
//         {
//           id: 'welcome-1',
//           type: 'welcome',
//           x: 400,
//           y: 220,
//           data: { 
//             title: 'Welcome Node',
//             prompt: 'Static Sentence',
//             message: 'hi, we are providing these services',
//             transitions: ['plumbing', 'Gardening', 'Repairing']
//           }
//         },
//         {
//           id: 'gardening-1',
//           type: 'conversation',
//           x: 800,
//           y: 120,
//           data: {
//             title: 'Gardening',
//             message: 'We are gardening 100 feet to 500 feet',
//             transitions: ['trees', 'plants']
//           }
//         }
//       ];
      
//       setNodes(retellNodes);
//       setConnections([
//         { id: 'conn-1', from: 'begin-1', to: 'welcome-1' },
//         { id: 'conn-2', from: 'welcome-1', to: 'gardening-1', transition: 'Gardening' }
//       ]);
//     }
//   }, []);


// // Handle Create button click
// const handleCreateFlow = async () => {
//   try {
//     setIsSaving(true)
//     console.log('🚀 Create button clicked!')
    
//     // Validate that we have nodes
//     if (nodes.length === 0) {
//       toast.error('Please add some nodes to your flow before saving')
//       console.log('❌ No nodes found')
//       return
//     }
    
//     // Check for begin node
//     const beginNode = nodes.find(node => node.type === 'begin')
//     if (!beginNode) {
//       toast.error('Flow must contain at least one Begin node')
//       console.log('❌ No begin node found')
//       return
//     }
    
//     console.log('📊 Flow data:', {
//       nodes: nodes.length,
//       connections: connections.length,
//       flowName,
//       flowDescription
//     })
    
//     // Prepare flow data
//     const flowData = {
//       name: flowName || 'Untitled Flow',
//       description: flowDescription || 'Conversation flow created with visual builder',
//       nodes: nodes,
//       connections: connections,
//       active: true
//     }
    
//     console.log('💾 Saving flow with data:', flowData)
    
//     // Save to database
//     const result = await serviceManagementService.createFlow(flowData)
    
//     // Show success message
//     toast.success(`Flow "${result.name}" saved successfully!`)
//     console.log('✅ Flow saved with ID:', result.flow_id)
    
//     // Close modal
//     setShowSaveModal(false)
    
//   } catch (error) {
//     console.error('❌ Save error:', error)
//     toast.error(error.message || 'Failed to save conversation flow')
//   } finally {
//     setIsSaving(false)
//   }
// }

// // Handle Simulation button click  
// const handleSimulation = () => {
//   console.log('🎮 Simulation button clicked!')
//   setShowSimulationModal(true)
//   toast.success('Opening simulation...')
// }

// // ADD THIS SAVE MODAL COMPONENT inside your FixedRetellCanvas component (before the return statement)
// const SaveModal = () => {
//   if (!showSaveModal) return null

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-lg p-6 w-96 max-w-md">
//         <h3 className="text-lg font-semibold mb-4">Save Conversation Flow</h3>
        
//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Flow Name *
//             </label>
//             <input
//               type="text"
//               value={flowName}
//               onChange={(e) => setFlowName(e.target.value)}
//               className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               placeholder="e.g., Customer Support Flow"
//             />
//           </div>
          
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Description
//             </label>
//             <textarea
//               value={flowDescription}
//               onChange={(e) => setFlowDescription(e.target.value)}
//               className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               rows={3}
//               placeholder="Describe what this flow handles..."
//             />
//           </div>
          
//           <div className="text-sm text-gray-600">
//             <p>Nodes: {nodes.length}</p>
//             <p>Connections: {connections.length}</p>
//           </div>
//         </div>
        
//         <div className="flex justify-end space-x-3 mt-6">
//           <button
//             onClick={() => setShowSaveModal(false)}
//             disabled={isSaving}
//             className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleCreateFlow}
//             disabled={isSaving || !flowName.trim()}
//             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
//           >
//             {isSaving && (
//               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
//             )}
//             <span>{isSaving ? 'Saving...' : 'Save Flow'}</span>
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }
//   // All functions properly defined before use\
//   const updateNodeData = (nodeId, updates) => {
//     setNodes(prev => prev.map(node => 
//       node.id === nodeId 
//         ? { ...node, data: { ...node.data, ...updates } }
//         : node
//     ));
//   };

//   const updateTempValue = (key, value) => {
//     setTempValues(prev => ({ ...prev, [key]: value }));
//   };

//   const startEditingTitle = (nodeId) => {
//     const node = nodes.find(n => n.id === nodeId);
//     if (node) {
//       setEditingNodeTitle(nodeId);
//       setTempValues(prev => ({ ...prev, [nodeId + '_title']: node.data.title }));
//     }
//   };

//   const startEditingMessage = (nodeId) => {
//     const node = nodes.find(n => n.id === nodeId);
//     if (node) {
//       setEditingNodeMessage(nodeId);
//       setTempValues(prev => ({ ...prev, [nodeId + '_message']: node.data.message }));
//     }
//   };

//   const saveTitle = (nodeId) => {
//     const newTitle = tempValues[nodeId + '_title'];
//     if (newTitle) {
//       updateNodeData(nodeId, { title: newTitle });
//     }
//     setEditingNodeTitle(null);
//   };

//   const saveMessage = (nodeId) => {
//     const newMessage = tempValues[nodeId + '_message'];
//     if (newMessage) {
//       updateNodeData(nodeId, { message: newMessage });
//     }
//     setEditingNodeMessage(null);
//   };

//   const cancelEdit = () => {
//     setEditingNodeTitle(null);
//     setEditingNodeMessage(null);
//     setEditingTransition(null);
//     setTempValues({});
//   };

//   // Drag functionality
//   const handleMouseDown = (e, node) => {
//     if (e.target.closest('.transition-item') || 
//         e.target.closest('.connection-point') || 
//         e.target.closest('button') ||
//         e.target.closest('input') ||
//         e.target.closest('textarea')) return;
    
//     e.preventDefault();
//     setIsDragging(node.id);
//     const rect = canvasRef.current.getBoundingClientRect();
//     setDragOffset({
//       x: e.clientX - rect.left - node.x,
//       y: e.clientY - rect.top - node.y
//     });
//   };

//   const handleMouseMove = useCallback((e) => {
//     if (!isDragging || !canvasRef.current) return;
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const newX = Math.max(150, Math.min(rect.width - 150, e.clientX - rect.left - dragOffset.x));
//     const newY = Math.max(80, Math.min(rect.height - 100, e.clientY - rect.top - dragOffset.y));
    
//     setNodes(prevNodes => 
//       prevNodes.map(node => 
//         node.id === isDragging 
//           ? { ...node, x: newX, y: newY }
//           : node
//       )
//     );
//   }, [isDragging, dragOffset]);

//   const handleMouseUp = useCallback(() => {
//     setIsDragging(null);
//     setIsConnecting(null);
//   }, []);

//   useEffect(() => {
//     if (isDragging) {
//       document.addEventListener('mousemove', handleMouseMove);
//       document.addEventListener('mouseup', handleMouseUp);
//       return () => {
//         document.removeEventListener('mousemove', handleMouseMove);
//         document.removeEventListener('mouseup', handleMouseUp);
//       };
//     }
//   }, [isDragging, handleMouseMove, handleMouseUp]);

//   // Node management
//   const addNode = (type) => {
//     const nodeTypes = {
//       'welcome': {
//         title: 'Welcome Node',
//         prompt: 'Static Sentence', 
//         message: 'Hello this is customer support department, how can I help you today?',
//         transitions: []
//       },
//       'conversation': {
//         title: 'Conversation',
//         message: 'We are providing this service',
//         transitions: []
//       },
//       'function': {
//         title: 'Function',
//         functionName: 'custom_function',
//         parameters: []
//       },
//       'condition': {
//         title: 'Logic Split Node',
//         condition: 'user_intent',
//         branches: []
//       },
//       'ending': {
//         title: 'Ending',
//         action: 'end_conversation'
//       }
//     };

//     const newNode = {
//       id: `${type}-${Date.now()}`,
//       type,
//       x: 300 + Math.random() * 200,
//       y: 200 + Math.random() * 200,
//       data: nodeTypes[type] || { title: 'New Node' }
//     };
    
//     setNodes(prev => [...prev, newNode]);
//   };

//   const deleteNode = (nodeId, e) => {
//     e.stopPropagation();
//     if (nodeId === 'begin-1') return;
    
//     setNodes(prev => prev.filter(node => node.id !== nodeId));
//     setConnections(prev => prev.filter(conn => 
//       conn.from !== nodeId && conn.to !== nodeId
//     ));
//     if (selectedNode?.id === nodeId) {
//       setSelectedNode(null);
//     }
//   };

//   // Transition management
//   const addTransition = (nodeId) => {
//     const node = nodes.find(n => n.id === nodeId);
//     if (!node) return;
    
//     const newTransition = `transition_${node.data.transitions?.length || 0}`;
//     updateNodeData(nodeId, {
//       transitions: [...(node.data.transitions || []), newTransition]
//     });
//   };

//   const updateTransition = (nodeId, oldTransition, newTransition) => {
//     const node = nodes.find(n => n.id === nodeId);
//     if (!node) return;
    
//     const updatedTransitions = node.data.transitions.map(t => 
//       t === oldTransition ? newTransition : t
//     );
    
//     updateNodeData(nodeId, { transitions: updatedTransitions });
    
//     setConnections(prev => prev.map(conn => 
//       conn.transition === oldTransition 
//         ? { ...conn, transition: newTransition }
//         : conn
//     ));
//   };

//   const deleteTransition = (nodeId, transition) => {
//     const node = nodes.find(n => n.id === nodeId);
//     if (!node) return;
    
//     const updatedTransitions = node.data.transitions.filter(t => t !== transition);
//     updateNodeData(nodeId, { transitions: updatedTransitions });
    
//     setConnections(prev => prev.filter(conn => conn.transition !== transition));
//   };

//   // Connection system
//   const startConnection = (nodeId, transition = null) => {
//     setIsConnecting({ from: nodeId, transition });
//   };

//   const completeConnection = (toNodeId) => {
//     if (!isConnecting) return;
    
//     const newConnection = {
//       id: `conn-${Date.now()}`,
//       from: isConnecting.from,
//       to: toNodeId,
//       transition: isConnecting.transition
//     };
    
//     setConnections(prev => [...prev, newConnection]);
//     setIsConnecting(null);
//   };

//   // Node Component
//   const RetellNode = ({ node }) => {
//     const getNodeHeaderColor = (type) => {
//       switch (type) {
//         case 'begin': return 'bg-purple-500';
//         case 'welcome': return 'bg-pink-500';
//         case 'conversation': return 'bg-gray-600';
//         case 'function': return 'bg-blue-500';
//         case 'condition': return 'bg-yellow-500';
//         case 'ending': return 'bg-red-500';
//         default: return 'bg-gray-500';
//       }
//     };

//     const isSelected = selectedNode?.id === node.id;
//     const isEditingTitle = editingNodeTitle === node.id;
//     const isEditingMessage = editingNodeMessage === node.id;

//     return (
//       <div
//         className={`absolute cursor-move select-none transform -translate-x-1/2 -translate-y-1/2 ${
//           isSelected ? 'ring-2 ring-blue-400' : ''
//         } ${isDragging === node.id ? 'z-50' : 'z-10'}`}
//         style={{ left: node.x, top: node.y }}
//         onMouseDown={(e) => handleMouseDown(e, node)}
//         onClick={(e) => {
//           e.stopPropagation();
//           setSelectedNode(node);
//         }}
//       >
//         <div className="bg-white rounded-lg shadow-lg border border-gray-300 min-w-64 max-w-80">
//           {/* Header */}
//           <div className={`${getNodeHeaderColor(node.type)} text-white p-3 rounded-t-lg`}>
//             <div className="flex items-center justify-between">
//               <div className="flex items-center space-x-2">
//                 <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
//                 <span className="font-medium text-sm">
//                   #{' '}
//                   {isEditingTitle ? (
//                     <input
//                       type="text"
//                       value={tempValues[node.id + '_title'] || ''}
//                       onChange={(e) => updateTempValue(node.id + '_title', e.target.value)}
//                       onKeyPress={(e) => {
//                         if (e.key === 'Enter') saveTitle(node.id);
//                         if (e.key === 'Escape') cancelEdit();
//                       }}
//                       onBlur={() => saveTitle(node.id)}
//                       className="bg-white text-black px-2 py-1 rounded text-sm min-w-32"
//                       autoFocus
//                     />
//                   ) : (
//                     <span 
//                       className="text-red-200 cursor-pointer hover:text-white"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         startEditingTitle(node.id);
//                       }}
//                     >
//                       {node.data.title}
//                     </span>
//                   )}
//                 </span>
//                 <button 
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     startEditingTitle(node.id);
//                   }}
//                   className="opacity-60 hover:opacity-100"
//                 >
//                   <Pencil className="w-3 h-3" />
//                 </button>
//               </div>
//               <div className="flex items-center space-x-1">
//                 <MoreHorizontal className="w-4 h-4 opacity-60" />
//                 {node.type !== 'begin' && (
//                   <button
//                     onClick={(e) => deleteNode(node.id, e)}
//                     className="opacity-70 hover:opacity-100"
//                   >
//                     <X className="w-4 h-4" />
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Content */}
//           <div className="p-4">
//             {/* Welcome Node Content */}
//             {node.type === 'welcome' && (
//               <div className="space-y-3">
//                 <div className="flex items-center space-x-2 text-xs">
//                   <span className="text-gray-500">Prompt</span>
//                   <span className="font-medium text-gray-700">{node.data.prompt}</span>
//                 </div>
//                 <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded">
//                   {isEditingMessage ? (
//                     <textarea
//                       value={tempValues[node.id + '_message'] || ''}
//                       onChange={(e) => updateTempValue(node.id + '_message', e.target.value)}
//                       onKeyPress={(e) => {
//                         if (e.key === 'Enter' && e.ctrlKey) saveMessage(node.id);
//                         if (e.key === 'Escape') cancelEdit();
//                       }}
//                       onBlur={() => saveMessage(node.id)}
//                       className="w-full p-2 border rounded resize-none bg-white"
//                       rows="3"
//                       autoFocus
//                     />
//                   ) : (
//                     <div 
//                       className="cursor-pointer hover:bg-gray-100 p-1 rounded"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         startEditingMessage(node.id);
//                       }}
//                     >
//                       {node.data.message}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}

//             {/* Conversation Node Content */}
//             {node.type === 'conversation' && (
//               <div className="text-sm text-gray-800">
//                 {isEditingMessage ? (
//                   <textarea
//                     value={tempValues[node.id + '_message'] || ''}
//                     onChange={(e) => updateTempValue(node.id + '_message', e.target.value)}
//                     onKeyPress={(e) => {
//                       if (e.key === 'Enter' && e.ctrlKey) saveMessage(node.id);
//                       if (e.key === 'Escape') cancelEdit();
//                     }}
//                     onBlur={() => saveMessage(node.id)}
//                     className="w-full p-2 border rounded resize-none bg-white"
//                     rows="2"
//                     autoFocus
//                   />
//                 ) : (
//                   <div 
//                     className="cursor-pointer hover:bg-gray-100 p-2 rounded"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       startEditingMessage(node.id);
//                     }}
//                   >
//                     {node.data.message}
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Begin Node */}
//             {node.type === 'begin' && (
//               <div className="text-center py-2 text-gray-500 text-xs">
//                 Flow starting point
//               </div>
//             )}
//           </div>

//           {/* Transition Section */}
//           {(node.type === 'welcome' || node.type === 'conversation') && (
//             <div className="border-t border-gray-200">
//               <div className="p-3">
//                 <div className="flex items-center justify-between mb-3">
//                   <span className="text-xs text-gray-500">Transition</span>
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       addTransition(node.id);
//                     }}
//                     className="text-gray-400 hover:text-gray-600"
//                   >
//                     <Plus className="w-3 h-3" />
//                   </button>
//                 </div>
                
//                 <div className="space-y-2">
//                   {node.data.transitions?.map((transition, idx) => (
//                     <div key={idx} className="transition-item group">
//                       {editingTransition === `${node.id}-${transition}` ? (
//                         <div className="flex items-center space-x-2">
//                           <input
//                             type="text"
//                             value={newTransitionText}
//                             onChange={(e) => setNewTransitionText(e.target.value)}
//                             onKeyPress={(e) => {
//                               if (e.key === 'Enter') {
//                                 updateTransition(node.id, transition, newTransitionText);
//                                 setEditingTransition(null);
//                                 setNewTransitionText('');
//                               }
//                             }}
//                             onBlur={() => {
//                               updateTransition(node.id, transition, newTransitionText);
//                               setEditingTransition(null);
//                               setNewTransitionText('');
//                             }}
//                             className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
//                             autoFocus
//                           />
//                         </div>
//                       ) : (
//                         <div className="flex items-center justify-between py-1">
//                           <div className="flex items-center space-x-2">
//                             <Zap className="w-3 h-3 text-gray-400" />
//                             <span 
//                               className="text-xs text-gray-700 cursor-pointer hover:text-blue-600"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 setEditingTransition(`${node.id}-${transition}`);
//                                 setNewTransitionText(transition);
//                               }}
//                             >
//                               {transition}
//                             </span>
//                           </div>
//                           <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 startConnection(node.id, transition);
//                               }}
//                               className="w-4 h-4 bg-blue-500 rounded-full border border-white hover:bg-blue-600"
//                               title="Connect to another node"
//                             />
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 deleteTransition(node.id, transition);
//                               }}
//                               className="text-red-500 hover:text-red-700"
//                             >
//                               <X className="w-3 h-3" />
//                             </button>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Connection Points */}
//           <div 
//             className="connection-point absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gray-400 rounded-full border-2 border-white cursor-pointer hover:bg-blue-500 transition-colors"
//             onClick={(e) => {
//               e.stopPropagation();
//               if (!isConnecting) {
//                 startConnection(node.id);
//               }
//             }}
//           />
//           <div 
//             className="connection-point absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gray-400 rounded-full border-2 border-white cursor-pointer hover:bg-blue-500 transition-colors"
//             onClick={(e) => {
//               e.stopPropagation();
//               if (isConnecting) {
//                 completeConnection(node.id);
//               }
//             }}
//           />
//         </div>
//       </div>
//     );
//   };

//   // Node Editor Panel
//   const NodeEditor = () => {
//     if (!selectedNode) return null;

//     return (
//       <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 z-40 overflow-y-auto">
//         <div className="p-6">
//           <div className="flex items-center justify-between mb-6">
//             <h3 className="text-lg font-semibold">Edit {selectedNode.data.title}</h3>
//             <button onClick={() => setSelectedNode(null)}>
//               <X className="w-5 h-5" />
//             </button>
//           </div>

//           <div className="space-y-6">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
//               <input
//                 type="text"
//                 value={selectedNode.data.title}
//                 onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               />
//             </div>

//             {(selectedNode.type === 'welcome' || selectedNode.type === 'conversation') && (
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
//                 <textarea
//                   value={selectedNode.data.message}
//                   onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
//                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   rows="4"
//                   placeholder="Enter the message for this node..."
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="h-screen bg-gray-50 flex flex-col">
//       {/* Header */}
//       <div className="flex items-center space-x-3">
//   <button 
//     onClick={() => {
//       console.log('🎯 Create button clicked!')
//       setShowSaveModal(true)
//     }}
//     className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
//   >
//     <Save className="w-4 h-4" />
//     <span>Create</span>
//   </button>
  
//   <button 
//     onClick={() => {
//       console.log('🎮 Simulation button clicked!')
//       handleSimulation()
//     }}
//     className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
//   >
//     <Play className="w-4 h-4" />
//     <span>Simulation</span>
//   </button>
// </div>

//       <div className="flex-1 flex">
//         {/* Professional Left Panel - Only Essential Nodes */}
//         <div className="w-72 bg-white border-r border-gray-200 p-4">
//           <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide">ADD NEW NODE</h3>
          
//           <div className="space-y-3">
//             <div className="flex items-center text-sm text-purple-600 mb-1">
//               <MessageSquare className="w-4 h-4 mr-2" />
//               Conversation Flow
//             </div>
            
//             <div className="border-b pb-4 mb-4">
//               <div className="space-y-3">
//                 <button
//                   onClick={() => addNode('welcome')}
//                   className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
//                 >
//                   <div className="font-medium text-sm text-gray-900">Welcome Node</div>
//                   <div className="text-xs text-gray-500 mt-1">Initial greeting with service options</div>
//                 </button>
                
//                 <button
//                   onClick={() => addNode('conversation')}
//                   className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
//                 >
//                   <div className="font-medium text-sm text-gray-900">Conversation</div>
//                   <div className="text-xs text-gray-500 mt-1">Service descriptions and responses</div>
//                 </button>
//               </div>
//             </div>

//             {/* Professional Tips */}
//             <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
//               <h4 className="font-medium text-sm text-blue-900 mb-2">Professional Tips</h4>
//               <ul className="text-xs text-blue-700 space-y-1">
//                 <li>• Click titles to edit node names</li>
//                 <li>• Click "Static Sentence" to change prompt type</li>
//                 <li>• Click message areas to edit content</li>
//                 <li>• Use transitions to connect services</li>
//               </ul>
//             </div>
//           </div>
//         </div>

//         {/* Canvas */}
//         <div className="flex-1 relative overflow-hidden">
//           <div 
//             ref={canvasRef}
//             className="w-full h-full bg-gray-100 relative overflow-auto"
//             style={{ 
//               backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', 
//               backgroundSize: '24px 24px',
//               backgroundPosition: '12px 12px'
//             }}
//             onClick={() => {
//               setSelectedNode(null);
//               setIsConnecting(null);
//             }}
//           >
//             {/* Connection Lines with better routing */}
//             <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
//               {connections.map((conn, index) => {
//                 const fromNode = nodes.find(n => n.id === conn.from);
//                 const toNode = nodes.find(n => n.id === conn.to);
//                 if (!fromNode || !toNode) return null;

//                 // Calculate connection points with offset for multiple connections
//                 const connectionOffset = index * 20 - (connections.length - 1) * 10;
//                 const startX = fromNode.x + 128;
//                 const startY = fromNode.y + connectionOffset;
//                 const endX = toNode.x - 128;
//                 const endY = toNode.y + connectionOffset;

//                 // Create curved path for better visual separation
//                 const midX = (startX + endX) / 2;
//                 const midY = Math.min(startY, endY) - 30;

//                 const pathData = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

//                 return (
//                   <g key={conn.id}>
//                     <path
//                       d={pathData}
//                       stroke="#9CA3AF"
//                       strokeWidth="2"
//                       fill="none"
//                       markerEnd="url(#arrowhead)"
//                     />
//                     {conn.transition && (
//                       <text
//                         x={midX}
//                         y={midY - 5}
//                         fill="#6B7280"
//                         fontSize="11"
//                         textAnchor="middle"
//                         className="pointer-events-none font-medium"
//                       >
//                         {conn.transition}
//                       </text>
//                     )}
//                   </g>
//                 );
//               })}
//               <defs>
//                 <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
//                   <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
//                 </marker>
//               </defs>
//             </svg>

//             {/* Nodes */}
//             {nodes.map(node => (
//               <RetellNode key={node.id} node={node} />
//             ))}

//             {/* Connection Helper */}
//             {isConnecting && (
//               <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm z-30">
//                 Click on a node to connect "{isConnecting.transition || 'output'}"
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
// <SaveModal />
//       {/* Node Editor */}
//       <NodeEditor />

//       {/* Simulation Modal */}
//       {/* Simulation Modal */}
// {showSimulationModal && (
//   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//     <div className="bg-white rounded-lg p-6 w-96">
//       <h3 className="text-lg font-semibold mb-4">Flow Simulation</h3>
//       <p className="text-gray-600 mb-4">Simulation feature coming soon...</p>
//       <button
//         onClick={() => setShowSimulationModal(false)}
//         className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
//       >
//         Close
//       </button>
//     </div>
//   </div>
// )}
//     </div>
//   );
// };

// export default FixedRetellCanvas;





















































































import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Save, Play, Settings, Trash2, Edit3, X, Check, Move, 
  MessageSquare, Zap, Building, User, Clock, Brain, MoreHorizontal,
  ChevronDown, Pencil
} from 'lucide-react';
import SimulationModal from './SimulationModal';
import { useQuery } from '@tanstack/react-query';
import { serviceManagementService, ConversationFlow } from '../../services/serviceManagement.service';
import toast from 'react-hot-toast';

const FixedRetellCanvas = () => {
  // ALL STATE DECLARATIONS FIRST
  const [isSaving, setIsSaving] = useState(false);
  const [flowName, setFlowName] = useState('Customer Service Flow');
  const [flowDescription, setFlowDescription] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [savedFlows, setSavedFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [isLoadingFlow, setIsLoadingFlow] = useState(false);
  const [showFlowSelector, setShowFlowSelector] = useState(false);
  
  // Existing state variables
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDragging, setIsDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(null);
  const [editingTransition, setEditingTransition] = useState(null);
  const [newTransitionText, setNewTransitionText] = useState('');
  const [editingNodeTitle, setEditingNodeTitle] = useState(null);
  const [editingNodeMessage, setEditingNodeMessage] = useState(null);
  const [tempValues, setTempValues] = useState({});
  
  const canvasRef = useRef(null);

  // REACT QUERY AFTER ALL STATE
  const { data: flowsData, isLoading: isLoadingFlows, refetch: refetchFlows } = useQuery({
    queryKey: ['conversation-flows'],
    queryFn: async () => {
      console.log('🔄 Fetching saved flows...');
      const flows = await serviceManagementService.getFlows();
      console.log('✅ Flows fetched:', flows);
      return flows;
    },
    onSuccess: (flows) => {
      setSavedFlows(flows);
      // Automatically load the most recent flow if available and no flow is currently selected
      if (flows.length > 0 && !selectedFlowId && nodes.length === 0) {
        const mostRecentFlow = flows[0]; // Flows should be sorted by created_at desc
        loadFlow(mostRecentFlow);
      }
    },
    onError: (error) => {
      console.error('❌ Error fetching flows:', error);
      toast.error('Failed to load saved flows');
    }
  });

  // FUNCTIONS AFTER HOOKS
  const loadFlow = (flow) => {
    try {
      console.log('📥 Loading flow:', flow.name, flow);
      
      setIsLoadingFlow(true);
      
      // Set flow metadata
      setFlowName(flow.name);
      setFlowDescription(flow.description || '');
      setSelectedFlowId(flow.id);
      
      // Load nodes and connections
      if (flow.nodes && flow.nodes.length > 0) {
        setNodes(flow.nodes);
      }
      
      if (flow.connections && flow.connections.length > 0) {
        setConnections(flow.connections);
      }
      
      toast.success(`Flow "${flow.name}" loaded successfully!`);
      console.log('✅ Flow loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading flow:', error);
      toast.error('Failed to load flow');
    } finally {
      setIsLoadingFlow(false);
    }
  };

  const createNewFlow = () => {
    setFlowName('New Flow');
    setFlowDescription('');
    setSelectedFlowId(null);
    
    // Reset to default nodes
    const defaultNodes = [
      {
        id: 'begin-1',
        type: 'begin',
        x: 120,
        y: 120,
        data: { title: 'Begin' }
      },
      {
        id: 'welcome-1',
        type: 'welcome',
        x: 400,
        y: 220,
        data: { 
          title: 'Welcome Node',
          prompt: 'Static Sentence',
          message: 'Hello, how can I help you today?',
          transitions: []
        }
      }
    ];
    
    setNodes(defaultNodes);
    setConnections([
      { id: 'conn-1', from: 'begin-1', to: 'welcome-1' }
    ]);
    
    toast.success('New flow created');
  };

  const handleCreateFlow = async () => {
    try {
      setIsSaving(true);
      console.log('🚀 Save/Update button clicked!');
      
      // Validate that we have nodes
      if (nodes.length === 0) {
        toast.error('Please add some nodes to your flow before saving');
        return;
      }
      
      // Check for begin node
      const beginNode = nodes.find(node => node.type === 'begin');
      if (!beginNode) {
        toast.error('Flow must contain at least one Begin node');
        return;
      }
      
      // Prepare flow data
      const flowData = {
        name: flowName || 'Untitled Flow',
        description: flowDescription || 'Conversation flow created with visual builder',
        nodes: nodes,
        connections: connections,
        active: true
      };
      
      console.log('💾 Saving flow with data:', flowData);
      
      let result;
      if (selectedFlowId) {
        // Update existing flow
        result = await serviceManagementService.updateFlow(selectedFlowId, flowData);
        toast.success(`Flow "${flowData.name}" updated successfully!`);
      } else {
        // Create new flow
        result = await serviceManagementService.createFlow(flowData);
        setSelectedFlowId(result.flow_id);
        toast.success(`Flow "${result.name}" saved successfully!`);
      }
      
      // Refresh flows list
      refetchFlows();
      
      // Close modal
      setShowSaveModal(false);
      
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error(error.message || 'Failed to save conversation flow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSimulation = () => {
    console.log('🎮 Simulation button clicked!');
    setShowSimulationModal(true);
  };

  // USEEFFECT AFTER ALL FUNCTIONS
  useEffect(() => {
    // Only initialize with default nodes if no flows are loaded and we're not loading flows
    if (nodes.length === 0 && !isLoadingFlows && (!flowsData || flowsData.length === 0)) {
      const retellNodes = [
        {
          id: 'begin-1',
          type: 'begin',
          x: 120,
          y: 120,
          data: { title: 'Begin' }
        },
        {
          id: 'welcome-1',
          type: 'welcome',
          x: 400,
          y: 220,
          data: { 
            title: 'Welcome Node',
            prompt: 'Static Sentence',
            message: 'hi, we are providing these services',
            transitions: ['plumbing', 'Gardening', 'Repairing']
          }
        },
        {
          id: 'gardening-1',
          type: 'conversation',
          x: 800,
          y: 120,
          data: {
            title: 'Gardening',
            message: 'We are gardening 100 feet to 500 feet',
            transitions: ['trees', 'plants']
          }
        }
      ];
      
      setNodes(retellNodes);
      setConnections([
        { id: 'conn-1', from: 'begin-1', to: 'welcome-1' },
        { id: 'conn-2', from: 'welcome-1', to: 'gardening-1', transition: 'Gardening' }
      ]);
    }
  }, [nodes.length, isLoadingFlows, flowsData]);

  // All your existing functions (keeping them unchanged)
  const updateNodeData = (nodeId, updates) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, ...updates } }
        : node
    ));
  };

  const updateTempValue = (key, value) => {
    setTempValues(prev => ({ ...prev, [key]: value }));
  };

  const startEditingTitle = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNodeTitle(nodeId);
      setTempValues(prev => ({ ...prev, [nodeId + '_title']: node.data.title }));
    }
  };

  const startEditingMessage = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setEditingNodeMessage(nodeId);
      setTempValues(prev => ({ ...prev, [nodeId + '_message']: node.data.message }));
    }
  };

  const saveTitle = (nodeId) => {
    const newTitle = tempValues[nodeId + '_title'];
    if (newTitle) {
      updateNodeData(nodeId, { title: newTitle });
    }
    setEditingNodeTitle(null);
  };

  const saveMessage = (nodeId) => {
    const newMessage = tempValues[nodeId + '_message'];
    if (newMessage) {
      updateNodeData(nodeId, { message: newMessage });
    }
    setEditingNodeMessage(null);
  };

  const cancelEdit = () => {
    setEditingNodeTitle(null);
    setEditingNodeMessage(null);
    setEditingTransition(null);
    setTempValues({});
  };

  // Drag functionality
  const handleMouseDown = (e, node) => {
    if (e.target.closest('.transition-item') || 
        e.target.closest('.connection-point') || 
        e.target.closest('button') ||
        e.target.closest('input') ||
        e.target.closest('textarea')) return;
    
    e.preventDefault();
    setIsDragging(node.id);
    const rect = canvasRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(150, Math.min(rect.width - 150, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(80, Math.min(rect.height - 100, e.clientY - rect.top - dragOffset.y));
    
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === isDragging 
          ? { ...node, x: newX, y: newY }
          : node
      )
    );
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    setIsConnecting(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Node management
  const addNode = (type) => {
    const nodeTypes = {
      'welcome': {
        title: 'Welcome Node',
        prompt: 'Static Sentence', 
        message: 'Hello this is customer support department, how can I help you today?',
        transitions: []
      },
      'conversation': {
        title: 'Conversation',
        message: 'We are providing this service',
        transitions: []
      },
      'function': {
        title: 'Function',
        functionName: 'custom_function',
        parameters: []
      },
      'condition': {
        title: 'Logic Split Node',
        condition: 'user_intent',
        branches: []
      },
      'ending': {
        title: 'Ending',
        action: 'end_conversation'
      }
    };

    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      x: 300 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      data: nodeTypes[type] || { title: 'New Node' }
    };
    
    setNodes(prev => [...prev, newNode]);
  };

  const deleteNode = (nodeId, e) => {
    e.stopPropagation();
    if (nodeId === 'begin-1') return;
    
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setConnections(prev => prev.filter(conn => 
      conn.from !== nodeId && conn.to !== nodeId
    ));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  // Transition management
  const addTransition = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const newTransition = `transition_${node.data.transitions?.length || 0}`;
    updateNodeData(nodeId, {
      transitions: [...(node.data.transitions || []), newTransition]
    });
  };

  const updateTransition = (nodeId, oldTransition, newTransition) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const updatedTransitions = node.data.transitions.map(t => 
      t === oldTransition ? newTransition : t
    );
    
    updateNodeData(nodeId, { transitions: updatedTransitions });
    
    setConnections(prev => prev.map(conn => 
      conn.transition === oldTransition 
        ? { ...conn, transition: newTransition }
        : conn
    ));
  };

  const deleteTransition = (nodeId, transition) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const updatedTransitions = node.data.transitions.filter(t => t !== transition);
    updateNodeData(nodeId, { transitions: updatedTransitions });
    
    setConnections(prev => prev.filter(conn => conn.transition !== transition));
  };

  // Connection system
  const startConnection = (nodeId, transition = null) => {
    setIsConnecting({ from: nodeId, transition });
  };

  const completeConnection = (toNodeId) => {
    if (!isConnecting) return;
    
    const newConnection = {
      id: `conn-${Date.now()}`,
      from: isConnecting.from,
      to: toNodeId,
      transition: isConnecting.transition
    };
    
    setConnections(prev => [...prev, newConnection]);
    setIsConnecting(null);
  };

  // Save Modal Component
  const SaveModal = () => {
    if (!showSaveModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            {selectedFlowId ? 'Update Conversation Flow' : 'Save Conversation Flow'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flow Name *
              </label>
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Customer Support Flow"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Describe what this flow handles..."
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Nodes: {nodes.length}</p>
              <p>Connections: {connections.length}</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowSaveModal(false)}
              disabled={isSaving}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFlow}
              disabled={isSaving || !flowName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isSaving ? (selectedFlowId ? 'Updating...' : 'Saving...') : (selectedFlowId ? 'Update Flow' : 'Save Flow')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Flow Selector Component  
  const FlowSelector = () => {
    if (!showFlowSelector) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Select Conversation Flow</h3>
            <button onClick={() => setShowFlowSelector(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <button
              onClick={() => {
                createNewFlow();
                setShowFlowSelector(false);
              }}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <span className="text-gray-600">Create New Flow</span>
            </button>
          </div>

          <div className="space-y-3">
            {isLoadingFlows ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading flows...</p>
              </div>
            ) : savedFlows.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No saved flows found</p>
              </div>
            ) : (
              savedFlows.map((flow) => (
                <div
                  key={flow.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedFlowId === flow.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    loadFlow(flow);
                    setShowFlowSelector(false);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{flow.name}</h4>
                      {flow.description && (
                        <p className="text-sm text-gray-600 mt-1">{flow.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Nodes: {flow.nodes?.length || 0}</span>
                        <span>Connections: {flow.connections?.length || 0}</span>
                        <span>Created: {new Date(flow.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {selectedFlowId === flow.id && (
                      <div className="ml-2">
                        <Check className="w-5 h-5 text-blue-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  // Keep your existing RetellNode and NodeEditor components unchanged
  const RetellNode = ({ node }) => {
    const getNodeHeaderColor = (type) => {
      switch (type) {
        case 'begin': return 'bg-purple-500';
        case 'welcome': return 'bg-pink-500';
        case 'conversation': return 'bg-gray-600';
        case 'function': return 'bg-blue-500';
        case 'condition': return 'bg-yellow-500';
        case 'ending': return 'bg-red-500';
        default: return 'bg-gray-500';
      }
    };

    const isSelected = selectedNode?.id === node.id;
    const isEditingTitle = editingNodeTitle === node.id;
    const isEditingMessage = editingNodeMessage === node.id;

    return (
      <div
        className={`absolute cursor-move select-none transform -translate-x-1/2 -translate-y-1/2 ${
          isSelected ? 'ring-2 ring-blue-400' : ''
        } ${isDragging === node.id ? 'z-50' : 'z-10'}`}
        style={{ left: node.x, top: node.y }}
        onMouseDown={(e) => handleMouseDown(e, node)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedNode(node);
        }}
      >
        <div className="bg-white rounded-lg shadow-lg border border-gray-300 min-w-64 max-w-80">
          {/* Header */}
          <div className={`${getNodeHeaderColor(node.type)} text-white p-3 rounded-t-lg`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                <span className="font-medium text-sm">
                  #{' '}
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={tempValues[node.id + '_title'] || ''}
                      onChange={(e) => updateTempValue(node.id + '_title', e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') saveTitle(node.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      onBlur={() => saveTitle(node.id)}
                      className="bg-white text-black px-2 py-1 rounded text-sm min-w-32"
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-red-200 cursor-pointer hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingTitle(node.id);
                      }}
                    >
                      {node.data.title}
                    </span>
                  )}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingTitle(node.id);
                  }}
                  className="opacity-60 hover:opacity-100"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center space-x-1">
                <MoreHorizontal className="w-4 h-4 opacity-60" />
                {node.type !== 'begin' && (
                  <button
                    onClick={(e) => deleteNode(node.id, e)}
                    className="opacity-70 hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Welcome Node Content */}
            {node.type === 'welcome' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-gray-500">Prompt</span>
                  <span className="font-medium text-gray-700">{node.data.prompt}</span>
                </div>
                <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded">
                  {isEditingMessage ? (
                    <textarea
                      value={tempValues[node.id + '_message'] || ''}
                      onChange={(e) => updateTempValue(node.id + '_message', e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) saveMessage(node.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      onBlur={() => saveMessage(node.id)}
                      className="w-full p-2 border rounded resize-none bg-white"
                      rows="3"
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingMessage(node.id);
                      }}
                    >
                      {node.data.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversation Node Content */}
            {node.type === 'conversation' && (
              <div className="text-sm text-gray-800">
                {isEditingMessage ? (
                  <textarea
                    value={tempValues[node.id + '_message'] || ''}
                    onChange={(e) => updateTempValue(node.id + '_message', e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) saveMessage(node.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    onBlur={() => saveMessage(node.id)}
                    className="w-full p-2 border rounded resize-none bg-white"
                    rows="2"
                    autoFocus
                  />
                ) : (
                  <div 
                    className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingMessage(node.id);
                    }}
                  >
                    {node.data.message}
                  </div>
                )}
              </div>
            )}

            {/* Begin Node */}
            {node.type === 'begin' && (
              <div className="text-center py-2 text-gray-500 text-xs">
                Flow starting point
              </div>
            )}
          </div>

          {/* Transition Section */}
          {(node.type === 'welcome' || node.type === 'conversation') && (
            <div className="border-t border-gray-200">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">Transition</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addTransition(node.id);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {node.data.transitions?.map((transition, idx) => (
                    <div key={idx} className="transition-item group">
                      {editingTransition === `${node.id}-${transition}` ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newTransitionText}
                            onChange={(e) => setNewTransitionText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateTransition(node.id, transition, newTransitionText);
                                setEditingTransition(null);
                                setNewTransitionText('');
                              }
                            }}
                            onBlur={() => {
                              updateTransition(node.id, transition, newTransitionText);
                              setEditingTransition(null);
                              setNewTransitionText('');
                            }}
                            className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center space-x-2">
                            <Zap className="w-3 h-3 text-gray-400" />
                            <span 
                              className="text-xs text-gray-700 cursor-pointer hover:text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTransition(`${node.id}-${transition}`);
                                setNewTransitionText(transition);
                              }}
                            >
                              {transition}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startConnection(node.id, transition);
                              }}
                              className="w-4 h-4 bg-blue-500 rounded-full border border-white hover:bg-blue-600"
                              title="Connect to another node"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTransition(node.id, transition);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Connection Points */}
          <div 
            className="connection-point absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gray-400 rounded-full border-2 border-white cursor-pointer hover:bg-blue-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (!isConnecting) {
                startConnection(node.id);
              }
            }}
          />
          <div 
            className="connection-point absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gray-400 rounded-full border-2 border-white cursor-pointer hover:bg-blue-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (isConnecting) {
                completeConnection(node.id);
              }
            }}
          />
        </div>
      </div>
    );
  };

  // Node Editor Panel
  const NodeEditor = () => {
    if (!selectedNode) return null;

    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 z-40 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Edit {selectedNode.data.title}</h3>
            <button onClick={() => setSelectedNode(null)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={selectedNode.data.title}
                onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {(selectedNode.type === 'welcome' || selectedNode.type === 'conversation') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={selectedNode.data.message}
                  onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="4"
                  placeholder="Enter the message for this node..."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedFlowId ? flowName : 'Conversation Flow Agent'}
            </h1>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
              {selectedFlowId ? (
                <>
                  <span>Flow ID: {selectedFlowId.slice(-8)}</span>
                  <span>•</span>
                  <span>Nodes: {nodes.length}</span>
                  <span>•</span>
                  <span>Connections: {connections.length}</span>
                  <span>•</span>
                  <span>{selectedFlowId ? 'Saved' : 'Unsaved'}</span>
                </>
              ) : (
                <>
                  <span>Agent ID: ag...da8</span>
                  <span>•</span>
                  <span>Conversation Flow ID: co...f22</span>
                  <span>•</span>
                  <span>$0.015/msg</span>
                  <span>•</span>
                  <span>25-125 tokens</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowFlowSelector(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              disabled={isLoadingFlows}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Load Flow</span>
            </button>
            
            <button 
              onClick={() => setShowSaveModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
              <span>{selectedFlowId ? 'Update' : 'Create'}</span>
            </button>
            
            <button 
              onClick={handleSimulation}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Simulation</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Professional Left Panel - Only Essential Nodes */}
        <div className="w-72 bg-white border-r border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wide">ADD NEW NODE</h3>
          
          {/* DEBUG INFO */}
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <div>Flows loaded: {savedFlows.length}</div>
            <div>Current nodes: {nodes.length}</div>
            <div>Current connections: {connections.length}</div>
            <div>Selected Flow: {selectedFlowId || 'None'}</div>
            <div>Loading: {isLoadingFlows ? 'Yes' : 'No'}</div>
            <div>flowsData: {flowsData?.length || 0}</div>
            <div className="flex gap-1 mt-2">
              <button 
                onClick={() => {
                  console.log('🔄 Force reloading flows...');
                  refetchFlows();
                }}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded"
              >
                Force Reload
              </button>
              <button 
                onClick={() => {
                  console.log('🎯 Manual load latest flow...');
                  console.log('savedFlows:', savedFlows);
                  console.log('flowsData:', flowsData);
                  if (savedFlows.length > 0) {
                    loadFlow(savedFlows[0]);
                  } else if (flowsData && flowsData.length > 0) {
                    console.log('Using flowsData instead');
                    setSavedFlows(flowsData);
                    loadFlow(flowsData[0]);
                  } else {
                    console.log('No flows available');
                  }
                }}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded"
              >
                Load Latest
              </button>
              <button 
                onClick={() => {
                  console.log('🕵️ Debug state:');
                  console.log('- flowsData:', flowsData);
                  console.log('- savedFlows:', savedFlows);
                  console.log('- selectedFlowId:', selectedFlowId);
                  console.log('- nodes:', nodes);
                  console.log('- connections:', connections);
                }}
                className="px-2 py-1 bg-purple-500 text-white text-xs rounded"
              >
                Debug
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center text-sm text-purple-600 mb-1">
              <MessageSquare className="w-4 h-4 mr-2" />
              Conversation Flow
            </div>
            
            <div className="border-b pb-4 mb-4">
              <div className="space-y-3">
                <button
                  onClick={() => addNode('begin')}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">Begin Node</div>
                  <div className="text-xs text-gray-500 mt-1">Flow starting point (required)</div>
                </button>
                
                <button
                  onClick={() => addNode('welcome')}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">Welcome Node</div>
                  <div className="text-xs text-gray-500 mt-1">Initial greeting with service options</div>
                </button>
                
                <button
                  onClick={() => addNode('conversation')}
                  className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">Conversation</div>
                  <div className="text-xs text-gray-500 mt-1">Service descriptions and responses</div>
                </button>
              </div>
            </div>

            {/* Professional Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-sm text-blue-900 mb-2">Professional Tips</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Click titles to edit node names</li>
                <li>• Click "Static Sentence" to change prompt type</li>
                <li>• Click message areas to edit content</li>
                <li>• Use transitions to connect services</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            ref={canvasRef}
            className="w-full h-full bg-gray-100 relative overflow-auto"
            style={{ 
              backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', 
              backgroundSize: '24px 24px',
              backgroundPosition: '12px 12px'
            }}
            onClick={() => {
              setSelectedNode(null);
              setIsConnecting(null);
            }}
          >
            {/* Connection Lines with better routing */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {connections.map((conn, index) => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;

                // Calculate connection points with offset for multiple connections
                const connectionOffset = index * 20 - (connections.length - 1) * 10;
                const startX = fromNode.x + 128;
                const startY = fromNode.y + connectionOffset;
                const endX = toNode.x - 128;
                const endY = toNode.y + connectionOffset;

                // Create curved path for better visual separation
                const midX = (startX + endX) / 2;
                const midY = Math.min(startY, endY) - 30;

                const pathData = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

                return (
                  <g key={conn.id}>
                    <path
                      d={pathData}
                      stroke="#9CA3AF"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                    />
                    {conn.transition && (
                      <text
                        x={midX}
                        y={midY - 5}
                        fill="#6B7280"
                        fontSize="11"
                        textAnchor="middle"
                        className="pointer-events-none font-medium"
                      >
                        {conn.transition}
                      </text>
                    )}
                  </g>
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
                </marker>
              </defs>
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <RetellNode key={node.id} node={node} />
            ))}

            {/* Connection Helper */}
            {isConnecting && (
              <div className="absolute top-4 left-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm z-30">
                Click on a node to connect "{isConnecting.transition || 'output'}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Modal */}
      <SaveModal />

      {/* Flow Selector Modal */}
      <FlowSelector />

      {/* Node Editor */}
      <NodeEditor />

      {/* Simulation Modal */}
      <SimulationModal
        isOpen={showSimulationModal}
        onClose={() => setShowSimulationModal(false)}
        nodes={nodes}
        connections={connections}
      />
    </div>
  );
};

export default FixedRetellCanvas;