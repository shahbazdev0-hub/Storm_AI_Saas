import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

async def add_services():
    client = AsyncIOMotorClient("mongodb+srv://hamza:hamza@cluster0.n44j3.mongodb.net/crm_platform")
    db = client["crm_platform"]
    
    flow_id = ObjectId("68f926542da781eb7ce150f7")
    
    # Service nodes to add
    services = [
        {"id": "node_cleaning", "title": "Home Cleaning", "position": {"x": 200, "y": 100}},
        {"id": "node_deep_clean", "title": "Deep Cleaning", "position": {"x": 200, "y": 200}},
        {"id": "node_plumbing", "title": "Plumbing Repair", "position": {"x": 200, "y": 300}},
        {"id": "node_electrical", "title": "Electrical Work", "position": {"x": 200, "y": 400}},
        {"id": "node_hvac", "title": "HVAC Service", "position": {"x": 200, "y": 500}},
    ]
    
    # Get existing flow
    flow = await db.conversation_flows.find_one({"_id": flow_id})
    
    if not flow:
        print("❌ Flow not found!")
        client.close()
        return
    
    print(f"📋 Current flow has {len(flow.get('nodes', []))} nodes")
    
    # Prepare new nodes
    new_nodes = []
    for service in services:
        node = {
            "id": service["id"],
            "type": "message",
            "position": service["position"],
            "data": {
                "title": service["title"],
                "message": f"Great! I can help you with {service['title']}. Would you like to book an appointment?",
                "buttons": [
                    {"label": "Yes, book appointment", "action": "book"},
                    {"label": "Tell me more", "action": "info"}
                ]
            }
        }
        new_nodes.append(node)
    
    # Update flow with new nodes (append to existing)
    existing_nodes = flow.get('nodes', [])
    all_nodes = existing_nodes + new_nodes
    
    # Create connections from services node to each service
    connections = flow.get('connections', [])
    for service in services:
        connections.append({
            "source": "node_services",  # Assuming you have a services menu node
            "target": service["id"],
            "transition": service["title"]
        })
    
    # Update the flow
    result = await db.conversation_flows.update_one(
        {"_id": flow_id},
        {
            "$set": {
                "nodes": all_nodes,
                "connections": connections,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    print(f"\n✅ Flow updated!")
    print(f"📊 Total nodes now: {len(all_nodes)}")
    print(f"🔗 Total connections: {len(connections)}")
    print("\nServices added:")
    for service in services:
        print(f"  • {service['title']}")
    
    client.close()

asyncio.run(add_services())