package com.kartographia.prospekt.service;

import java.util.*;

import javaxt.express.*;
import javaxt.express.notification.NotificationService;

import javaxt.utils.Record;
import javaxt.http.servlet.ServletException;

//******************************************************************************
//**  FileService
//******************************************************************************
/**
 *   Provides a set of web methods used to manage and view files on the server
 *
 ******************************************************************************/

public class FileService extends WebService {

    private javaxt.express.services.FileService fileService;

  //**************************************************************************
  //** Constructor
  //**************************************************************************
    public FileService(javaxt.io.Jar jar){
        javaxt.io.Directory dir = new javaxt.io.Directory(jar.getFile().getParentFile());

      //Special case when prospekt is deployed in another app
        String dirName = dir.getName();
        if (dirName.equals("lib")) dir = dir.getParentDirectory();

      //Special case for ant and maven dev
        dirName = dir.getName();
        if (dirName.equals("target") || dirName.equals("dist")) dir = dir.getParentDirectory();

        fileService = new javaxt.express.services.FileService(dir);
    }


  //**************************************************************************
  //** getServiceResponse
  //**************************************************************************
  /** Used to process a web request
   *  @param database Not used
   */
    public ServiceResponse getServiceResponse(ServiceRequest request,
        javaxt.sql.Database database) throws ServletException {
        try{

            String op = request.getPath(0).toString();
            if (op==null) op = "";
            else op = op.toLowerCase().trim();

            if (op.equals("upload")){
                return fileService.upload(request, (Record record)->{

                    String path = record.get("path").toString();
                    javaxt.io.File file = (javaxt.io.File) record.get("file").toObject();
                    path += file.getName();

                    NotificationService.notify(record.get("op").toString(), "File", new javaxt.utils.Value(path));
                });
            }
            else if (op.equals("download")){
                ServiceResponse response = fileService.getFile(request);
                String fileName = response.get("name").toString();
                response.setContentDisposition(fileName);
                return response;
            }
            else{
                return fileService.getList(request);
            }
        }
        catch(Exception e){
            return new ServiceResponse(e);
        }
    }


}