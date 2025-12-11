## [1.28.1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.28.0...v1.28.1) (2024-12-13)


### Bug Fixes

* **routes:** increase file size limits for upload endpoints to 100MB ([e758c87](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/e758c87976595f7708493e1dfcada24a48aeb075))

# [1.28.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.27.3...v1.28.0) (2024-12-11)


### Bug Fixes

* comment out email notification logic in role and department assignment ([2ca811d](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/2ca811df66546bd62b5e9e9839aaa18b07b4a0dd))


### Features

* add user assignment functionality with department and role filtering ([16fa9b7](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/16fa9b7cc86bed5d12bfa1cb093831b8ed4e6688))
* increase default page size to 50 and add new routes for fetching and revoking assigned users ([83c3345](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/83c33450a58c46b949db59f354cd1356c671f0ef))

## [1.27.3](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.27.2...v1.27.3) (2024-12-09)


### Bug Fixes

* correct SQL query syntax for fetching signature users ([b36f459](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/b36f4593652c59f332d0757c0a93076ef2192309))

## [1.27.2](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.27.1...v1.27.2) (2024-12-06)


### Bug Fixes

* enhance error handling and logging for file operations in admin and public controllers ([2c2a38e](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/2c2a38e305c2e7df62ec15cd4324cabe4e6b98ef))
* improve error handling during file deletion and enhance logging details ([1146b80](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/1146b80ae39bc8455076075d9d524e8fcab92087))

## [1.27.1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.27.0...v1.27.1) (2024-12-06)


### Bug Fixes

* correct SQL query syntax by removing unnecessary AND clause ([489d3fb](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/489d3fbb8811147790be9eb36b8611d1157fc669))

# [1.27.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.26.0...v1.27.0) (2024-12-05)


### Features

* include signed document URL in eSign dashboard response ([9030d56](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/9030d56b87eb374612fb75d7b3653e0106c91d7a))

# [1.26.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.25.0...v1.26.0) (2024-12-03)


### Features

* add campaign list and export functionality with validation ([0de835b](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/0de835b5508be9ee9376f7ca941bb78a19ab1ed0))

# [1.25.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.24.0...v1.25.0) (2024-12-03)


### Features

* implement campaign management features and update validation logic ([af2ad7b](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/af2ad7bb2871fe143c58c61282c443d0d7606f1b))

# [1.24.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.23.0...v1.24.0) (2024-12-03)


### Features

* add bulk email sending functionality and new campaign email template ([d7eb5d9](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/d7eb5d9016647586e4109e2948724d6d5a68254c))

# [1.23.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.22.0...v1.23.0) (2024-12-03)


### Features

* enhance campaign creation by bulk inserting participants and improve token verification response ([68ea1c5](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/68ea1c5289a03f70ba0d06ad68417f321d69ca0d))

# [1.22.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.21.0...v1.22.0) (2024-12-03)


### Features

* implement Office 365 email integration and update campaign creation validation ([bc65901](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/bc65901439b6c6510464a9e6c88a0539b1469442))

# [1.21.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.20.3...v1.21.0) (2024-12-03)


### Features

* add CreatedBy field to campaign creation and adjust token generation response ([ee912c8](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/ee912c8709c6d18ac9c6a6bb7e1437c7390bcf71))

## [1.20.3](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.20.2...v1.20.3) (2024-11-27)


### Bug Fixes

* remove authentication middleware from media access route ([7b419db](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/7b419db7973f4991d6787b62ee4ece10551d6155))

## [1.20.2](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.20.1...v1.20.2) (2024-11-27)


### Bug Fixes

* add authentication middleware for media access route ([97ac3f2](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/97ac3f23481bd3b550f0df39be7b10afff400117))

## [1.20.1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.20.0...v1.20.1) (2024-11-27)


### Bug Fixes

* ensure fillFormRules resolves promise for valid form input ([478cdec](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/478cdecca79a99d677b85759a754fb8f376ec09f))

# [1.20.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.19.0...v1.20.0) (2024-11-27)


### Features

* add fillFormRules validation for form submission ([4ee4eaa](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/4ee4eaafc93bce9da9ed8e2c7360713ab594e307))

# [1.19.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.18.0...v1.19.0) (2024-11-20)


### Features

* retain FormJSON in form module creation and update processes ([4a3f9e3](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/4a3f9e36e8d944eb8af1e476d78729dbf41999b7))

# [1.18.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.17.0...v1.18.0) (2024-11-20)


### Features

* include FormJSON in form module creation and retrieval processes ([41fbfe0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/41fbfe0b818f821e156eb74fb875f77556810cc2))

# [1.17.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.16.1...v1.17.0) (2024-11-20)


### Features

* add endpoint and validation for viewing form data by process owner ([3d33a48](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/3d33a48fcdd5f411fb029f9e072474d44634cb52))

## [1.16.1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.16.0...v1.16.1) (2024-11-20)


### Bug Fixes

* update access ID retrieval and enhance query structure in data controller ([db263d0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/db263d08badea8c87c499e9503c227916043d31b))

# [1.16.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.15.1...v1.16.0) (2024-11-20)


### Features

* add endpoints to view created and edited form elements for FormModuleDraft ([c548a1c](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/c548a1c32664da62a55a80ca79b5d9537320f53c))

## [1.15.1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.15.0...v1.15.1) (2024-11-19)


### Bug Fixes

* allow dynamic UserModuleLinkID in createFormModuleSubmission ([69e41c3](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/69e41c30d43687f75a389eb255d922ed9acfd4ef))

# [1.15.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.14.0...v1.15.0) (2024-11-19)


### Features

* add createFormModuleSubmission endpoint and FormModuleSubmission model for handling form submissions ([5b20e21](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/5b20e2186252e0d7568f4c24a62156873add076a))

# [1.14.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.13.0...v1.14.0) (2024-11-19)


### Features

* add validation rules for creating form elements in FormModule; update route to use new rules ([7ddc7dc](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/7ddc7dcfbb8e8e7e4b2d76384ac9d099206c7e20))

# [1.13.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.12.0...v1.13.0) (2024-11-19)


### Features

* enhance FormModule and FormModuleDraft models with created/modified tracking fields; add new route for creating form elements ([3274f05](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/3274f05fde4c64fa23a51c68d783426ea3ce5496))

# [1.12.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.11.0...v1.12.0) (2024-11-18)


### Features

* add Form module support in validation rules and activity log checks ([cf2d3e8](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/cf2d3e815f0a53a18686ae9c7df3a75e07b0d040))

# [1.11.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.10.3...v1.11.0) (2024-11-18)


### Features

* add support for Form module in element assignment and validation ([87ae3b2](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/87ae3b25c5e1cba81d326af32e59c66aae53c2ba))

## [1.10.3](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.10.2...v1.10.3) (2024-11-18)


### Bug Fixes

* improve error handling in user authentication process ([f115439](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/f11543956315d337d5eb5b71547be70f66781a77))

## [1.10.2](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.10.1...v1.10.2) (2024-11-18)


### Bug Fixes

* update tag validation to allow commas in document and module tags ([37da58f](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/37da58f1cecb8505701b2012dc32530e33b5c1e8))

## [1.10.1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.10.0...v1.10.1) (2024-11-18)


### Bug Fixes

* update route to list form modules in admin routes ([19098e1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/19098e10c2b37ed109549e079502b80f0a8ce66d))

# [1.10.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.9.0...v1.10.0) (2024-11-18)


### Features

* add validation rules for form module creation, publishing, and draft viewing ([f965b74](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/f965b746c25d88deb43b6c118401edff0f042817))

# [1.9.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.8.2...v1.9.0) (2024-11-18)


### Features

* add FormModule and FormModuleDraft models with associations and routes for form management ([b8bc5f9](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/b8bc5f968b59281abb2ac676325f782acdd3ee69))

## [1.8.2](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.8.1...v1.8.2) (2024-11-18)


### Bug Fixes

* streamline file path handling for temp_preview in uploadFile utility ([5f1bfa6](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/5f1bfa68d7d5fd2d540fcb8e0e1c77c940500fb8))

## [1.8.1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.8.0...v1.8.1) (2024-11-18)


### Bug Fixes

* simplify file path handling for temp_preview in uploadFile utility ([6f65d09](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/6f65d09a60f6a0132600b2840382468990889c84))

# [1.8.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.7.1...v1.8.0) (2024-11-18)


### Features

* add support for temporary preview directory in resource access middleware ([bb6d475](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/bb6d4757a29860ed1893e7b0273369a8412d92a4))

## [1.7.1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.7.0...v1.7.1) (2024-11-18)


### Bug Fixes

* standardize string comparison and add missing semicolons ([9c57a54](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/9c57a54d159f7e1761407b52aeea5a741415b17c))

# [1.7.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.6.0...v1.7.0) (2024-11-18)


### Features

* add file upload route with size limit and type restrictions ([8cfd544](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/8cfd5446ecbcd62548feed0076bec010c84e25a3))

# [1.6.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.5.0...v1.6.0) (2024-11-18)


### Features

* **user:** optimize user deletion process by removing unnecessary await statements ([45503ce](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/45503ce3e6bbf37eee766c6afc92c9167ab0981c))

# [1.5.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.4.0...v1.5.0) (2024-11-15)


### Features

* **user:** add soft delete fields to UserDetails model and update validation rules ([a911c2e](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/a911c2e2793b9091fdd93e74c0793a33d803747a))

# [1.4.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.3.0...v1.4.0) (2024-11-15)


### Features

* **socket:** add access token to chat message handling ([9559390](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/9559390a7091748c056351ce1771b34282fec429))

# [1.3.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.2.0...v1.3.0) (2024-11-15)


### Features

* **socket:** add room management and enhance chat message handling ([a530afa](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/a530afadf5310cc99da18049958f99359b853cb4))

# [1.2.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.1.8...v1.2.0) (2024-11-15)


### Features

* **routes:** add support for additional video formats (3GP, H265, MOB) ([c150354](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/c1503549bf47ec4a8218a8affd86a1df21a33753))

## [1.1.8](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.1.7...v1.1.8) (2024-11-14)


### Bug Fixes

* update error message for invalid path in resourceAccess middleware ([d37b90f](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/d37b90fa7b46d5bff656b64c9920cc7edf5c82a0))

## [1.1.7](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.1.6...v1.1.7) (2024-11-14)


### Bug Fixes

* simplify file path handling in uploadFile function ([df05530](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/df05530ece4a46471d7ddbe58e65800aece180c9))

## [1.1.6](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.1.5...v1.1.6) (2024-11-14)


### Bug Fixes

* update path handling to use platform-specific separators for DocumentPath, TrainingSimulationPath, and VideoFileUrl ([ba58cc8](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/ba58cc8fe8d2c7d918ac4075003f576628ed6a59))

## [1.1.5](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.1.4...v1.1.5) (2024-11-14)


### Bug Fixes

* enhance path handling for TrainingSimulationPath and VideoFileUrl, ensuring null safety ([462f60f](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/462f60f3be65ecc77f5a1654d3bf5fd7a16a0446))

## [1.1.4](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.1.3...v1.1.4) (2024-11-14)


### Bug Fixes

* simplify file path handling in uploadFile utility ([8cfb825](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/8cfb82544804de2b34216de2b7bc4859af01ad5b))

## [1.1.3](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.1.2...v1.1.3) (2024-11-14)


### Bug Fixes

* update path handling for signed document file URLs to use platform-specific separators ([1f6bdba](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/1f6bdba1cc88e6e53f6d669aac0083f0a174e677))

## [1.1.2](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.1.1...v1.1.2) (2024-11-14)


### Bug Fixes

* handle invalid file paths in URL generation and improve error response ([3baaf5b](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/3baaf5bf823895e1fc04824e8762a1b5326a304f))

## [1.1.1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.1.0...v1.1.1) (2024-11-14)


### Bug Fixes

* serve static files from the /public route ([6ced60a](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/6ced60aefad07f14370d6221682179d36ff5b061))

# [1.1.0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/compare/v1.0.0...v1.1.0) (2024-11-14)


### Features

* implement eSignMailService for enhanced email handling in e-signature process ([74aa134](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/74aa134f1e15c77c8fab6bb4feda27f72e0318ec))

# 1.0.0 (2024-11-13)


### Bug Fixes

* clean up commented code in index.js ([eb9a7fa](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/eb9a7fac1da967e20817d5d2b270be66d8769159))
* correct casing of 'markers' in eSign request processing ([91afa57](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/91afa5716477f0f6e74396d67c71e086eb809c00))
* correct casing of ClientID to ClientId in addUserToOrganizationStructure ([1077181](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/107718196711dea890cdab99f2a8c8ba7f323ee0))
* correct typo in IsTraningLinkIsVideo to IsTrainingLinkIsVideo across multiple files ([4b6e30e](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/4b6e30e27be8bf00dc4d76f4fa58fed1424af124))
* correct typo in TrainingSimulationModuleDraft reference in createTrainingSimulationModule function ([4b1c6ae](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/4b1c6ae480531c2434acdeb834556be327a23276))
* correct variable names in fillESignRequest for accurate count comparison ([121e193](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/121e193ed215d86ac4aeaff323854f4a5b6ee222))
* enhance email service to send signed document notifications with personalized filenames ([944eac2](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/944eac2d2ba330022a96b163a7f98186d7ff6431))
* enhance video file handling in Skill Building module creation and update upload file middleware to make file requirement optional ([fd14aaa](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/fd14aaa6dafcb0209f073ca0fc0b15fe101d0b6b))
* ensure BACKEND_URL ends with a trailing slash for consistency ([633131a](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/633131ab2facd538d77d55a6bcc5818698b6260b))
* ensure eSign directory exists before placing markers on PDF ([abc770b](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/abc770b3c6e1465b81798e5e5264e6a55a4fdab9))
* format email list in eSign request and improve notification assignment logic ([0736e81](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/0736e81f88e0709dae25a2d5ab53edc12a1dbcb7))
* improve error handling in PDF processing for better user feedback ([9ffeb94](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/9ffeb94290e5fc82712ab0f6b0824a2927037131))
* refactor eSign request handling to streamline email notifications and update status logic ([5576958](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/5576958918cca1b36191bba3d7cc993d82d0511b))
* refactor fillESignRequest to simplify file path handling and improve attachment configuration ([6c12f80](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/6c12f8080741b21b3125c864f08d98570eb11a0d))
* refactor fillESignRequest to streamline document signing process and improve error handling in placeMarkersOnPDF ([8ff73e1](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/8ff73e1ffc8d2de60abcf9bec80a5ae691106694))
* remove moment formatting for createdDate and activity date in eSign dashboard ([88198ba](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/88198bad2eb197d6c6d0cfdcc2366ea7c70ba125))
* remove moment formatting for createdDate in eSign dashboard list ([c5d61f9](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/c5d61f96133699e03066db602f977d5bdae47a65))
* remove unnecessary ESignReceiverID reference in fillESignRequest function ([6c772ea](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/6c772ea0a6ecbf585c6e6117b4f4ddb58c70e459))
* remove unnecessary UTC formatting from eSign dashboard activity date ([338d216](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/338d21678dd1b2e1da7f4752f645209b5d214082))
* revert to moment for date formatting in eSign dashboard activity ([c1b0a5d](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/c1b0a5d14e11d7f2b00e28d32dff26eeaf957cdf))
* revert to moment for date handling in eSign dashboard activity ([4bfcf64](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/4bfcf64c1a04c4bcd10488aa5cc4c83adc86fe34))
* update attachment path to include backend URL in fillESignRequest ([921fbad](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/921fbad9acfcbbb41f4a38fad2b3fbdcd777b839))
* update backend URL in environment configuration ([cd7aaa6](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/cd7aaa63700f888b855de60f3700d9853333dd54))
* update BACKEND_URL for local development and refactor PDF filename generation in eSignRequest ([6825683](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/6825683e248cb1e1d5eca0cbf2804bb8b62b01c1))
* update BACKEND_URL to use production API endpoint ([d315b17](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/d315b173309d8c4c6c4319851ce5621f7af68449))
* update date formatting to use moment.utc in eSign dashboard activity ([ddddb47](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/ddddb4712f7c6c1cbbaad83e5b4b7226e986e487))
* update email service to handle multiple signed documents and define associations for ESignActivity ([862fa20](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/862fa20b79eb264b2d0569f115e8d97550cf8295))
* update eSign activity date to use local time instead of ISO string ([6fec1ea](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/6fec1ea35a1bfd96a7d89521d83820e9820722f3))
* update eSign dashboard activity date to use UTC offset for formatting ([e2013ab](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/e2013ab57454c1e069f86f13e9a603a3fb0ede7b))
* update eSign dashboard activity to use moment-timezone for date formatting ([9e33c7a](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/9e33c7a4b3b9e49c3ccd3b8617d2931e419d2ff3))
* update eSign dashboard to include user email for personalized document counts ([a513320](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/a5133203a3c772fab0d8f0b02fa6d32546cf7530))
* update eSign request link generation to include receiver ID in the URL ([b5ee2c0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/b5ee2c09c1c43e760c39b8cc3953ec128295a413))
* update eSign request link generation to use correct path for request links ([fc09da6](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/fc09da61dad54aaa9fa97f38e5b18256fb4b35ce))
* update eSign request link to use request origin; correct ReceiverId reference in error handling ([67d0bae](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/67d0bae382be82d2e5b7e2d805f928211e82efb9))
* update eSign status from 'Signed' to 'Completed' ([f39efa5](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/f39efa55da2420c2b6b43ef3f7586299e8976711))
* update eSign.controller.js to improve null checks and add logging for eSign creation status ([5fbd367](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/5fbd367566a67ffd1d8061171fa5cf8375ec9335))
* update fetch import to dynamic import for better compatibility ([8618bc0](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/8618bc05f046f25f26e84d6bb63936fa344b57e4))
* update file path handling in fillESignRequest to ensure correct attachment path and improve error logging ([a25737d](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/a25737d811f233620182d6666fca8433d7e8bbff))
* update file upload validation to check for file presence only when required ([c0bb217](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/c0bb21713bab441137615c3284f569936d698f1b))


### Features

* add e-signature functionality with file upload and status management ([cde4eef](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/cde4eeff79eba9de60c939ee664734e072f0883c))
* add ESign dashboard and activity endpoints; establish associations between ESignRequest, ESignDocument, and ESignReceiver ([d86b8fa](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/d86b8fa1078dff4850c035aa4957bf0c3f3cc155))
* add node-fetch dependency and update package-lock.json ([e06dc75](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/e06dc75fc7e0b09d4fe086a348354e9955cfb3c9))
* add timestamp to e-signature activity log ([a9cc12a](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/a9cc12a32b16b72827086e9aad076e4dc993580f))
* add VideoFileUrl field to TrainingSimulation models and implement video upload functionality ([e44055d](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/e44055d4ca08db0064e5155d73882885037f8140))
* enhance e-signature functionality with new routes, improved file handling, and additional environment configuration ([c613f89](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/c613f892603051e2afd0500149b21845d4e24c2d))
* enhance email sending with error handling and logging; update eSign attributes and pagination defaults ([8ede4c9](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/8ede4c969c24ab92e35caad84a64f55a3ac62e8f))
* enhance eSign dashboard filtering with user email and improved metrics handling ([64c9501](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/64c95017f80aa58d2b86b155fa0afff602679955))
* enhance eSign dashboard with pagination and sorting capabilities ([5aa5aba](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/5aa5aba1513c56021bc34b2e5f8e8dbf4c1d2cb1))
* enhance ESign request validation; add rules for receiver ID and request ID ([9a26ed9](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/9a26ed9ef73c926c41aa6a96621d430875b25ecf))
* enhance impact analysis logic to include additional module handling and update associations ([6c339c5](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/6c339c52c73eb1d12947ef3d886b54f134573d7a))
* implement public eSign routes and validation for eSign requests ([bb30a43](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/bb30a43adaefb1f420755afb7bbfbd1e44f55438))
* refactor eSign dashboard functions and add dashboard cards endpoint ([2d823ed](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/2d823eda8de9645ac0e6ae6630dacbc90db16675))
* rename eSignActivity to eSignDashboardActivity for clarity in controller and route ([adb6c9c](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/adb6c9cac878383909e0b627b214aa47fad787a8))
* update eSign dashboard filtering to use currentUserEmail and enhance status handling ([36c3d4a](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/36c3d4a8ad946c8f6b4336b0b2fa69529837493d))
* update eSign dashboard to use moment-timezone for UTC date handling ([a610efb](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/a610efbd1622ff51866a969e6c77125032635884))
* update file upload validation to make file requirement optional ([2dbf071](https://github.com/ZerozillaTechnologies/pluto-nodejs-backend/commit/2dbf071a058502bee140c0c9d5099bd527005551))
