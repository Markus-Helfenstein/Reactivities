# Development Setup

- install Postman (predefined requests are included in course assets)
- install Node.js (includes NPM)
- install Visual Studio Code
- install git
- install .NET SDK 8 & EF tool (dotnet tool install --global dotnet-ef --version 8.*)
- recommended VS Code plugins  
![grafik](https://github.com/user-attachments/assets/e3d9b918-2e98-4fe2-8caf-517b0d8cacc2)
- pull repository from github
- configure SQL Server (i.e. local instance with SQL Server Authentication) and set connection string in API DEV settings
- for image upload, create Cloudinary account and configure API key and secret in appsettings.json of API  
![grafik](https://github.com/user-attachments/assets/ee07c9e0-cf0f-4787-a1c5-056516cfb7f8)

# Production Setup

- set up sql server, database and login
- set up kestrel web server app running .net 8 runtime
- configure github workflow action similar to the existing one in the respository, so node and packages are installed, and react app build output is exported into wwwroot folder of the .net backend app (API). 
- generate base64 value of 512 bit key using PowerShell  
`[Convert]::ToBase64String((1..64|%{[byte](Get-Random -Max 256)}))`
- configure TokenKey together with Cloudinary configuration in appsettings.json  
![grafik](https://github.com/user-attachments/assets/5ad114ea-1b6b-438f-88e7-8cefb56f2107)  
see DEV setting in comparison  
![grafik](https://github.com/user-attachments/assets/3c56779e-38f8-4a28-a17a-12ac22f3411f)
- make sure web sockets are enabled  
![grafik](https://github.com/user-attachments/assets/db006b05-9a26-4edf-9595-671db9671be6)
