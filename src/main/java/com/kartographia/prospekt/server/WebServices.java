package com.kartographia.prospekt.server;
import com.kartographia.prospekt.data.*;
import com.kartographia.prospekt.*;

import java.util.*;
import java.io.IOException;

import javaxt.sql.*;
import javaxt.json.*;
import javaxt.io.Jar;

import javaxt.express.WebService;
import javaxt.express.ServiceRequest;
import javaxt.express.ServiceResponse;
import javaxt.http.servlet.HttpServletRequest;
import javaxt.http.servlet.HttpServletResponse;
import javaxt.http.servlet.ServletException;


public class WebServices extends WebService {


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public WebServices(Jar jar) throws Exception {

      //Register classes that this service will support
        for (Jar.Entry entry : jar.getEntries()){
            String name = entry.getName();
            if (name.endsWith(".class")){
                name = name.substring(0, name.length()-6).replace("/", ".");
                Class c = Class.forName(name);
                if (javaxt.sql.Model.class.isAssignableFrom(c)){
                    addClass(c);
                }
            }
        }
    }


  //**************************************************************************
  //** processRequest
  //**************************************************************************
  /** Used to process an HTTP request and generate an HTTP response.
   */
    protected void processRequest(String service, HttpServletRequest request, HttpServletResponse response)
        throws ServletException, IOException {


        if (request.isWebSocket()){
            //processWebSocketRequest(service, request, response);
        }
        else{

          //Process request
            ServiceResponse rsp = getServiceResponse(service, new ServiceRequest(request));


          //Set general response headers
            response.setStatus(rsp.getStatus());
            response.setContentType(rsp.getContentType());


          //Set authentication header as needed
            String authMessage = rsp.getAuthMessage();
            String authType = request.getAuthType();
            if (authMessage!=null && authType!=null){
                if (authType.equalsIgnoreCase("BASIC")){
                    response.setHeader("WWW-Authenticate", "Basic realm=\"" + authMessage + "\"");
                }
            }


          //Send payload
            Object obj = rsp.getResponse();
            if (obj instanceof java.io.InputStream){
                Long contentLength = rsp.getContentLength();
                if (contentLength!=null){
                    response.setHeader("Content-Length", contentLength+"");
                }

                java.io.InputStream inputStream = (java.io.InputStream) obj;
                response.write(inputStream, true);
                inputStream.close();
            }
            else if (obj instanceof javaxt.io.File){
                javaxt.io.File file = (javaxt.io.File) obj;
                response.write(file.toFile(), file.getName(), file.getContentType(), true);
            }
            else{
                response.write((byte[]) obj, true);
            }
        }
    }


  //**************************************************************************
  //** getServiceResponse
  //**************************************************************************
    private ServiceResponse getServiceResponse(String service, ServiceRequest request)
        throws ServletException {


      //Authenticate request
        try{
            request.authenticate();
        }
        catch(Exception e){
            return new ServiceResponse(403, "Not Authorized");
        }

        if (service.equals("reports")){
            return new ServiceResponse(501, "Not Implemented");
        }
        else{
            return getServiceResponse(request, Config.getDatabase());
        }

    }



    public ServiceResponse getOpportunitiesV2(ServiceRequest request, Database database) throws ServletException {

        request.setPath("/opportunities"); //hack so we can call super
        byte[] b = (byte[]) super.getServiceResponse(request, database).getResponse();
        JSONObject json = new JSONObject(new String(b));

        JSONArray rows = json.get("rows").toJSONArray();
        JSONArray cols = json.get("cols").toJSONArray();


        JSONArray arr = new JSONArray();
        for (int i=0; i<rows.length(); i++){
            JSONArray row = rows.get(i).toJSONArray();

            json = new JSONObject();
            for (int j=0; j<row.length(); j++){
                JSONValue val = row.get(j);
                String field = cols.get(j).toString();
                json.set(field, val);
            }

            arr.add(json);
        }

        return new ServiceResponse(arr);
    }






}