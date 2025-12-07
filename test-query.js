// Test script for querying the German Insurance API
// Usage: node test-query.js

const testQuery = async () => {
  const url = 'http://localhost:3000/api/query';
  
  const requestBody = {
    question: 'What is insurance?'
  };

  console.log('🚀 Sending request to:', url);
  console.log('📝 Question:', requestBody.question);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Response status:', response.status, response.statusText);
    console.log('');

    const data = await response.json();
    
    console.log('✅ Response received:');
    console.log('─'.repeat(60));
    console.log('Question:', data.question);
    console.log('');
    console.log('Answer:', data.answer);
    console.log('');
    console.log('Sources:', data.sources?.length || 0, 'document(s)');
    
    if (data.sources && data.sources.length > 0) {
      console.log('');
      data.sources.forEach((source, index) => {
        console.log(`  Source ${index + 1}:`, source);
      });
    }
    
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.cause?.code === 'ECONNREFUSED') {
      console.error('');
      console.error('💡 Make sure the server is running:');
      console.error('   npm start');
    }
  }
};

// Run the test
testQuery();
