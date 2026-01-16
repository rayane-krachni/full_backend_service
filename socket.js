const axios = require('axios');
const ioClient = require("socket.io-client");

// Configuration
const BASE_URL = 'https://api.sahtii.com/api/messages';
const DOCTOR_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTVjY2M1ODZiNWRiZDVmNjVkZWQxNGEiLCJpYW0iOjE3Njg0MjYzNTksImV4cCI6MTc2ODUxMjc1OSwidHlwZSI6IkFDQ0VTU19UT0tFTiIsInRhcmdldCI6IkRPQ1RPUiIsImlhdCI6MTc2ODQyNjM1OX0.y_dPZjPlKukO5UOcc7TL7aYOz6Mvt0ftLXsm6ZoIeANw8KxM26Xgn0RNw0J9xhuyGoOf7BCE7LSeFcLvUWC1RMdkQE7y6JoYxKC8OgKj2w6cuMRuonNkkxCOkSvQtBm4J3_OF8iZJqqx5rGi0S5PEyyttXYCDmOCB505U0d8jvZnD5CHgoDKf3gYfyoaOYOH1Nt95QcH88mOKnwaC96l5d0h83b1DPVK3rqRWOka50V5UUpXAE8KsApNqRghvofD3VN1VkmFpgA5NdQld0KT2BjbJCR3NGtOJKF_y1w3QPOIrT0AP-b8uCAgrt7FPBBb9hcCId1r1nRBim0w9FYR6lz6iX72zvfmcazuiRzby-sLQOZf3i7TNyvaPTYYqvEiotWwowyyzHAqGGSBaw-dqHrhrxm0m1VDHlCvq_53hx1BYVvmQ4tQGouXs8SGuYj8Xv4Pvr7JRyvE3yybXe_MVzIXZgKmpdfHjfrfApKJBF_xei9KQ5PB_jlTj9s4_SLmB-Rc-AErldwvQdNrz4gDbDgTtinXosd61o33EaUJ4trJ-3zuOra2sUAtS1QLQZz3XBPASRgdPHEvjmgDjsD7B336Mk3eKUnUjU8zJ3YV2Jxn3vysRD_OdFFIPa0IvhJxDHaSSF7gRa8km_ot75Q8h9g1LcvJwnzS90RqsH7ojNw';
const PATIENT_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGE5NzQ2NGI5ODkzZmFlMDM0YzdkZjEiLCJpYW0iOjE3Njg0MjYzODYsImV4cCI6MTc2ODUxMjc4NiwidHlwZSI6IkFDQ0VTU19UT0tFTiIsInRhcmdldCI6IlBBVElFTlQiLCJpYXQiOjE3Njg0MjYzODZ9.4IRd7TmrOzUThesLa_bh0lK9D7_1G23lP2nGv_ibJ-3-CPA55bqwRtZQ8IU7BMEdlfGdm-X26PM4d9pjvIY1O-e1q8f_IGl460c1NzOnX2iqvYkY-08Yjp2WhXJw_Z8jCLE_32H6ZNHNDR8QoEQYrvHgR7-AN23SPf5aw-GrUDKYNkjBtoRnkC_l17N0Q6QgD9KLFvLeZkhbALNmfYSAB1z3-vk_Aw0cI2Np2cvRI66Z5l7fA2Z0u9jAGymuiVOVsP_WOQDBiXoAh7e_MFp88THZ7gwJ6xSe9K3WPSNtbBDTJNhlUm9hb_mLoHT0tredq0smPxocHhI_YoIiEYpdR3VdD8PUczZBar4nh-d8zg4cuNtV3ItyUtMn0lAv_vQeYEi6ZFWMRRjZmC8WjzCAcV_ZxsF6laQ-X5Ta6pVYTHWZQ04frJWeeQMbFk8_AE0BWFjxTzGgybcHitUnDtpJo8nA5WrdPWuv4JsOwDYpmIdVKPCgoEOdAReiodMo-okjoWaFBpvDCdzQ0VFVxocJP3G1fFc-1wkhJfQJPgV-iNACkQRT3cBdL_msW4rtPYIYqrzHqx0M-Gt_X7BJC8_NNUPqrIXdxOBSLLO7ou-YImRGa39-3_aPtXElZKK-ZQklu_D8LPJ-sFGPC5WNzQ17qElGHGenKCWa-uoFvF_Me_A';
const PATIENT_ID = '68a97464b9893fae034c7df1'; // Replace with actual patient ID
const DOCTOR_ID = '695ccc586b5dbd5f65ded14a'; // Replace with actual doctor ID

// Create HTTP client with auth headers
const patientHttp = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Bearer ${PATIENT_TOKEN}` }
});

const doctorHttp = axios.create({
  baseURL: BASE_URL,
  headers: { Authorization: `Bearer ${DOCTOR_TOKEN}` }
});

// Test all messaging functions
async function testMessagingSystem() {
  try {
    console.log('=== Starting Messaging System Tests ===');
    
    // 1. Setup WebSocket connections
    console.log('\n1. Setting up WebSocket connections...');
    const patientSocket = ioClient("https://api.sahtii.com", {
      transports: ["polling", "websocket"], // Try polling first (works better with proxies)
      auth: { token: PATIENT_TOKEN }
    });

    const doctorSocket = ioClient("https://api.sahtii.com", {
      transports: ["polling", "websocket"], // Try polling first (works better with proxies)
      auth: { token: DOCTOR_TOKEN }
    });

    // Add error handlers to debug connection issues
    patientSocket.on("connect_error", (err) => {
      console.error('Patient socket connection error:', err.message);
    });
    doctorSocket.on("connect_error", (err) => {
      console.error('Doctor socket connection error:', err.message);
    });

    // Setup message listeners
    patientSocket.on("new-message", (msg) => {
      console.log('\nPatient received new message via socket:', msg);
    });

    patientSocket.on("messages-seen", (data) => {
      console.log('\nPatient received messages-seen event:', data);
    });

    doctorSocket.on("new-message", (msg) => {
      console.log('\nDoctor received new message via socket:', msg);
    });

    doctorSocket.on("messages-seen", (data) => {
      console.log('\nDoctor received messages-seen event:', data);
    });

    // Wait for connections with timeout
    const connectWithTimeout = (socket, name, timeout = 5000) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`${name} connection timed out after ${timeout}ms`));
        }, timeout);
        socket.on('connect', () => {
          clearTimeout(timer);
          console.log(`${name} connected!`);
          resolve();
        });
      });
    };

    await connectWithTimeout(patientSocket, 'Patient socket');
    await connectWithTimeout(doctorSocket, 'Doctor socket');
    console.log('Both sockets connected successfully');

    // 2. Patient sends message to doctor (HTTP)
    console.log('\n2. Patient sending message to doctor via HTTP...');
    const patientMessage = { text: "Hello Doctor, I have a question about my treatment." };
    const sentFromPatient = await patientHttp.post(`/doctor/${DOCTOR_ID}`, patientMessage);
    console.log('HTTP response from patient message:', sentFromPatient.data);

    // 3. Doctor checks messages (HTTP)
    console.log('\n3. Doctor checking their messages via HTTP...');
    const doctorMessages = await doctorHttp.get('/doctor');
    console.log('Doctor messages:', doctorMessages.data);

    // 4. Doctor marks messages as seen
    console.log('\n4. Doctor marking messages as seen...');
    await doctorHttp.patch(`/mark-seen/${PATIENT_ID}`, { user: PATIENT_ID });
    console.log('Messages marked as seen');

    // 5. Doctor replies to patient (HTTP)
    console.log('\n5. Doctor sending reply to patient via HTTP...');
    const doctorReply = { text: "Hello Patient, what would you like to know?" };
    const sentFromDoctor = await doctorHttp.post(`/patient/${PATIENT_ID}`, doctorReply);
    console.log('HTTP response from doctor message:', sentFromDoctor.data);

    // 6. Patient checks messages (HTTP)
    console.log('\n6. Patient checking their messages via HTTP...');
    const patientMessages = await patientHttp.get('/patient');
    console.log('Patient messages with coach info:', patientMessages.data);

    // 7. Patient marks messages as seen
    console.log('\n7. Patient marking messages as seen...');
    await patientHttp.patch(`/mark-seen/${DOCTOR_ID}`);
    console.log('Messages marked as seen');

    // 8. Test direct socket messaging
    console.log('\n8. Testing direct socket messaging...');
    patientSocket.emit('send-message', {
      receiver: DOCTOR_ID,
      text: "Socket direct message from patient"
    });

    doctorSocket.emit('send-message', {
      receiver: PATIENT_ID,
      text: "Socket direct message from doctor"
    });

    // 9. Cleanup - wait a bit for socket messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n=== All tests completed ===');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testMessagingSystem();