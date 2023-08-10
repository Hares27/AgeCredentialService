import {createWallet,mnemonic} from "./config.js";
import { HypersignSSISdk } from "hs-ssi-sdk";
import { Bip39 } from "@cosmjs/crypto";
import dotenv from 'dotenv';
dotenv.config();

import express from "express";

const app=express();
app.set("view engine","ejs");
app.use(express.json());
app.use(express.static("public"));


app.listen(3000,()=>
{
  console.log("Express app listening");
})








  const InitializeHypersign=async()=>
  {
    const offlineSigner = await createWallet(mnemonic);
    

    const hsSdk = new HypersignSSISdk(
      {
      offlineSigner: offlineSigner,
      namespace: 'testnet',
      nodeRpcEndpoint: "https://rpc.jagrat.hypersign.id",  
      nodeRestEndpoint: "https://api.jagrat.hypersign.id"   
      }
    );

    await hsSdk.init();
    
  
    return hsSdk;

  };
 

  const generateKeys=async(hsSdk)=>
  {
    const hypersignDID=hsSdk.did;
    const kp = await hypersignDID.generateKeys({  controller: 'did:hid:testnet:controller' });
    
    return kp;

  }
  const generateDID=async(hsSdk,address)=>
  {
const hypersignDID=hsSdk.did;


const didDocument = await hypersignDID.generate({ publicKeyMultibase:address});

console.log("Documentation",didDocument);


return {didDocument};


  }

  const signDID=async(kp,didDocument,hsSdk)=>
  {
   
    const hypersignDID=hsSdk.did;
    const params = {
      privateKeyMultibase: kp.privateKeyMultibase,
      challenge: 'cred',
      domain: 'www.hypersign.id',
      did: '',
      didDocument: didDocument,
      verificationMethodId: didDocument.verificationMethod[0].id,
    };
    try{
    const signedDocument = await hypersignDID.sign(params);

    return {signedDocument};
    }
    catch(err)
    {
      console.log(err.message);
    }
   
  }

  const verifyDID=async(hsSdk,signedDocument,didDocument)=>
  {
    const hypersignDID=hsSdk.did;
    const result = await hypersignDID.verify({
      didDocument: signedDocument,
      verificationMethodId:didDocument.verificationMethod[0].id,
      challenge: 'cred',
      domain: 'www.hypersign.id',
    });
  

  }

  
  

  const registerDID=async(didDocument,kp,hsSdk)=>
  {
    const hypersignDID=hsSdk.did;
   
    
    
    
    
    const result = await hypersignDID.register({
      didDocument,
      privateKeyMultibase:kp.privateKeyMultibase,
      verificationMethodId:didDocument.verificationMethod[0].id,
    });
    console.log("Register",result);
    return {result};

    
  }

  async function resolveDID(hsSdk,did){
    const hypersignDID=hsSdk.did;
    const result = await hypersignDID.resolve({
      did,
    });
    console.log("resolveDID");
    return {result};
  }

 const createDID=async()=>
 {
   const hsSdk=await InitializeHypersign();
   
   const kp=await generateKeys(hsSdk);
   
   const{didDocument}=await generateDID(hsSdk,kp.publicKeyMultibase);
   const signedDocument=await signDID(kp,didDocument,hsSdk);
  //  await verifyDID(hsSdk,signedDocument,didDocument);
  console.log("signedDocument",signedDocument);

   await registerDID(didDocument,kp,hsSdk);
   
   
   return {didDocument,hsSdk,kp};

   

 }

 app.get("/",(req,res)=>
 {
   res.render("home");
 })

 app.get("/createDID",async(req,res)=>
 {
   const{didDocument,hsSdk,kp}=await createDID();
   res.json({"did":didDocument.id, "publicKey":kp.publicKeyMultibase,"privateKey":kp.privateKeyMultibase});
 })


 



 

 
 const address=process.env.publicaddress;
 console.log(address);
 const did=process.env.did;
 console.log("did",did);
 const key=process.env.privatekey;
 console.log(key);
 const schemaId=process.env.schemaId;
 console.log(schemaId);


 // store private and public key in environment variables

 const createSchema=async()=>
 {
   const hsSdk=await InitializeHypersign();
   console.log("createSchema");
   try{
     console.log(did);
   const schema=await generateSchema(hsSdk)
   const signedSchema=await signSchema(schema,hsSdk);
   console.log("signedSchema",signedSchema);
   const registeredSchema=await registerSchema(hsSdk,signedSchema);
   console.log(registeredSchema);
   return signedSchema;
   
   }
   catch(err)
   {
     console.log(err.message);
   }
 }

 const generateSchema=async(hsSdk)=>
{
  
  const hypersignSchema=hsSdk.schema;
 const schemaBody = {
   name: 'Schemaforcredentials',
   description: 'This is a test schema generation',
   author: did,
   fields: [{ name: 'name', type: 'string', isRequired: false },{ age: 'age', type: 'integer', isRequired: false }],
   additionalProperties: false,
 }
 const schema = await hypersignSchema.generate(schemaBody);
 
 console.log("generated schema");
 return schema;

};



const signSchema=async(schema,hsSdk)=>
{
  console.log("schema",schema);
 const hypersignSchema=hsSdk.schema;
 try{
   
   
   const document=await generateDID(hsSdk,address);
   const didDocument=await document.didDocument;
   
   
   const signedschema = await hypersignSchema.sign({ privateKeyMultibase:key, schema:schema, verificationMethodId:didDocument.verificationMethod[0].id });
   
  
   return signedschema;
  }
 
 catch(err)
 {
   console.log(err.message);
 }
   
 
}




const registerSchema=async(hsSdk,signedSchema)=>
{
 const hypersignSchema=hsSdk.schema;
 try{
   console.log("signedSchema",signedSchema);
 const registeredSchema = await hypersignSchema.register({
   schema: signedSchema
});
 
console.log("registeredSchema",registeredSchema);
return registeredSchema;

 }
 catch(err)
 {
   console.log(err.message);
 }
}








 app.get("/createSchema",async(req,res)=>
 {
   const signedSchema=await createSchema();
   res.json({signedSchema});
   

 })





 

 



 let link;

 app.get("/issuecredentials",(req,res)=>
 {
   res.render("issueCredentials");

 })
 app.post("/issueCredentials",async(req,res)=>
 {
  const hsSdk=await InitializeHypersign();
  const {userdid}=req.body;
  
  const credentials=await issueCredentials(hsSdk,userdid);
  console.log(credentials);
  console.log("credentials link",credentials.credentialStatus.id);
   link=credentials.credentialStatus.id;
  if(credentials.credentialStatus.id)
  {
    res.json(link);
  }
  


 })

 app.get("/download",(req,res)=>
 {
   res.render("download",{link:"https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?cs=srgb&dl=pexels-pixabay-268533.jpg&fm=jpg"});
 })

 

 async function issueCredentials(hsSdk,userdid){
  
   const credential=await generateCredentials(hsSdk,userdid);
   console.log("credentials",credential);

   
   const signedCredentials=await issueCredential(hsSdk,credential)
   return signedCredentials;

 }

 async function generateCredentials(hsSdk,userdid){

  const hypersignVC=hsSdk.vc;
 
  console.log("SchemaId",schemaId);
  
  try{
  const credentialBody = {
    schemaId: schemaId,
    subjectDid: userdid,
    issuerDid: did,
    fields: { name: 'name' },
    expirationDate: '2027-12-10T18:30:00.000Z',
  };
  
  const credential = await hypersignVC.generate(credentialBody);
  console.log("Credentials",credential);
  return credential;
}
catch(err)
{
  console.log(err.message);
}
  
 }


 async function issueCredential(hsSdk,credential){
  const hypersignVC=hsSdk.vc;
   try{
    
    const document=await generateDID(hsSdk,address);
    const didDocument=await document.didDocument;

    const tempIssueCredentialBody = {
      credential:credential, 
      issuerDid: did,
      verificationMethodId: didDocument.verificationMethod[0].id,
      privateKeyMultibase: key,
    };
   

    
    const issuedCredResult = await hypersignVC.issue(tempIssueCredentialBody);
    const { signedCredential, credentialStatus, credentialStatusProof, credentialStatusRegistrationResult } =
  issuedCredResult;
    console.log("issueCredResult",issuedCredResult);
    return signedCredential;
   
    
   }
   catch(err)
   {
     console.log(err.message);
   }
 }

 










