// Vercel Function: /api/fieldroutes.js
// This webhook receives data from VAPI and interacts with FieldRoutes API

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify VAPI secret for security
  const vapiSecret = req.headers['authorization'] || req.headers['x-vapi-secret'];
  if (vapiSecret !== process.env.VAPI_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get data from VAPI
    const { 
      operation, 
      name, 
      phone, 
      email, 
      address, 
      service_type, 
      agent_name,
      agent_phone,
      agent_email 
    } = req.body;

    console.log('VAPI Request:', req.body);

    // Your FieldRoutes API configuration
    const FIELDROUTES_API_KEY = process.env.FIELDROUTES_API_KEY;
    const FIELDROUTES_BASE_URL = process.env.FIELDROUTES_BASE_URL || 'https://api.fieldroutes.com';

    if (!FIELDROUTES_API_KEY) {
      return res.status(500).json({ error: 'FieldRoutes API key not configured' });
    }

    // Initialize response
    let response = {};

    switch (operation) {
      case 'create_customer':
        response = await createCustomer({
          name,
          phone,
          email,
          address,
          service_type,
          agent_name,
          agent_phone,
          agent_email
        });
        break;

      case 'search_customer':
        response = await searchCustomer({ phone, name });
        break;

      case 'book_service':
        response = await bookService({
          name,
          phone,
          email,
          address,
          service_type
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    // Return response to VAPI
    return res.status(200).json({
      success: true,
      message: response.message,
      data: response.data
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }

  // Helper function to create customer in FieldRoutes
  async function createCustomer(customerData) {
    try {
      // Split name into first and last
      const nameParts = customerData.name.split(' ');
      const fname = nameParts[0] || '';
      const lname = nameParts.slice(1).join(' ') || '';

      // Prepare customer data for FieldRoutes
      const fieldRoutesData = {
        fname: fname,
        lname: lname,
        phone: customerData.phone,
        email: customerData.email,
        address: customerData.address
      };

      // Add notes about real estate agent if provided
      if (customerData.agent_name) {
        fieldRoutesData.notes = `Real Estate Agent: ${customerData.agent_name}`;
        if (customerData.agent_phone) {
          fieldRoutesData.notes += ` Phone: ${customerData.agent_phone}`;
        }
        if (customerData.agent_email) {
          fieldRoutesData.notes += ` Email: ${customerData.agent_email}`;
        }
      }

      // Add service type to notes
      if (customerData.service_type) {
        const serviceNote = `Requested Service: ${customerData.service_type}`;
        fieldRoutesData.notes = fieldRoutesData.notes 
          ? `${fieldRoutesData.notes}. ${serviceNote}`
          : serviceNote;
      }

      // Call FieldRoutes API (you'll need to adapt this to actual API format)
      const result = await callFieldRoutesAPI('customer', 'create', fieldRoutesData);

      return {
        message: `Customer ${fname} ${lname} created successfully in FieldRoutes`,
        data: result
      };

    } catch (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  // Helper function to search for existing customer
  async function searchCustomer(searchData) {
    try {
      // Search by phone first, then name
      let searchParams = {};
      
      if (searchData.phone) {
        searchParams.phone = searchData.phone;
      } else if (searchData.name) {
        const nameParts = searchData.name.split(' ');
        searchParams.fname = nameParts[0];
        if (nameParts.length > 1) {
          searchParams.lname = nameParts.slice(1).join(' ');
        }
      }

      const result = await callFieldRoutesAPI('customer', 'search', searchParams);

      if (result && result.length > 0) {
        return {
          message: `Found ${result.length} customer(s)`,
          data: result
        };
      } else {
        return {
          message: 'No customers found',
          data: []
        };
      }

    } catch (error) {
      throw new Error(`Failed to search customers: ${error.message}`);
    }
  }

  // Helper function to book service
  async function bookService(serviceData) {
    try {
      // First create customer if needed
      const customer = await createCustomer(serviceData);
      
      // Then create service/appointment (you'll need FieldRoutes appointment API details)
      // This is a placeholder - you'll need the actual appointment creation API
      
      return {
        message: `Service booking initiated for ${serviceData.name}`,
        data: customer.data
      };

    } catch (error) {
      throw new Error(`Failed to book service: ${error.message}`);
    }
  }

  // Helper function to call FieldRoutes API
  async function callFieldRoutesAPI(module, action, data) {
    // This simulates the apiModule.call() structure from FieldRoutes examples
    // You'll need to adapt this to the actual HTTP API format
    
    const url = `${FIELDROUTES_BASE_URL}/${module}/${action}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIELDROUTES_API_KEY}`,
        // Add other required headers based on FieldRoutes documentation
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`FieldRoutes API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}
