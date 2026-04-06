
app/(buildingEmployee)/jobs.tsx:448:23 - error TS2339: Property 'id' does not exist on type '{ userId?: number; fullName?: string; name?: string; email?: string; }'.

448         comment.user?.id ??
                          ~~

app/(buildingEmployee)/jobs.tsx:464:28 - error TS2339: Property 'id' does not exist on type '{ userId?: number; fullName?: string; name?: string; email?: string; }'.

464       unknownComment.user?.id ??
                               ~~

app/(buildingEmployee)/jobs.tsx:765:65 - error TS2353: Object literal may only specify known properties, and 'size' does not exist in type 'InfoOptions'.

765       const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
                                                                    ~~~~

app/(buildingEmployee)/jobs.tsx:1842:3 - error TS1117: An object literal cannot have multiple properties with the same name.

1842   sectionTitle: {
       ~~~~~~~~~~~~

app/(buildingEmployee)/jobs.tsx:1888:3 - error TS1117: An object literal cannot have multiple properties with the same name.

1888   commentHeader: {
       ~~~~~~~~~~~~~

app/(management)/buildings.tsx:287:36 - error TS2345: Argument of type '"service_provider"' is not assignable to parameter of type '"building_employee"'.       

287       actions.getRatingSummaries?.("service_provider") || [];
                                       ~~~~~~~~~~~~~~~~~~

app/(management)/maintenance/_components/CreateScheduleModal.tsx:34:29 - error TS2551: Property 'createModalContent' does not exist on type '{ container: { flex: number; backgroundColor: string; }; scrollView: { flex: number; }; content: { paddingBottom: number; }; statsContainer: { flexDirection: "row"; gap: number; marginBottom: number; }; ... 68 more ...; submitButtonText: { ...; }; }'. Did you mean 'modalContent'?

34         <View style={styles.createModalContent}>
                               ~~~~~~~~~~~~~~~~~~

  app/(management)/maintenance/_styles.ts:295:3
    295   modalContent: {
          ~~~~~~~~~~~~~~~
    296     backgroundColor: "#fff",
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ...
    311     }),
        ~~~~~~~
    312   },
        ~~~
    'modalContent' is declared here.

app/(management)/maintenance/_components/CreateScheduleModal.tsx:99:33 - error TS2339: Property 'formRow' does not exist on type '{ container: { flex: number; backgroundColor: string; }; scrollView: { flex: number; }; content: { paddingBottom: number; }; statsContainer: { flexDirection: "row"; gap: number; marginBottom: number; }; ... 68 more ...; submitButtonText: { ...; }; }'.

99             <View style={styles.formRow}>
                                   ~~~~~~~

app/(management)/maintenance/_components/CreateScheduleModal.tsx:174:63 - error TS2339: Property 'submitButtonDisabled' does not exist on type '{ container: { flex: number; backgroundColor: string; }; scrollView: { flex: number; }; content: { paddingBottom: number; }; statsContainer: { flexDirection: "row"; gap: number; marginBottom: number; }; ... 68 more ...; submitButtonText: { ...; }; }'.

174             style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
                                                                  ~~~~~~~~~~~~~~~~~~~~

app/(management)/profile.tsx:59:41 - error TS2551: Property 'department' does not exist on type 'UserProfile'. Did you mean 'apartment'?

59       department: currentUser?.profile?.department || "",
                                           ~~~~~~~~~~

  lib/types/index.ts:25:3
    25   apartment?: string;
         ~~~~~~~~~
    'apartment' is declared here.

app/(management)/profile.tsx:60:34 - error TS2339: Property 'bio' does not exist on type 'UserProfile'.

60       bio: currentUser?.profile?.bio || "",
                                    ~~~

app/(management)/profile.tsx:86:9 - error TS2561: Object literal may only specify known properties, but 'department' does not exist in type 'Partial<UserProfile>'. Did you mean to write 'apartment'?

86         department: profileForm.department.trim() || undefined,
           ~~~~~~~~~~

app/(management)/requests.tsx:2090:53 - error TS2339: Property 'body' does not exist on type 'RequestComment'.

2090                         {comment.message || comment.body || ""}
                                                         ~~~~

app/(modals)/notice-details.tsx:144:5 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"admin"' have no overlap.

144     currentUser?.role === "admin" ||
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app/(modals)/notice-details.tsx:145:5 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"super_admin"' have no overlap.

145     currentUser?.role === "super_admin" ||
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app/(modals)/notifications-hub.tsx:185:15 - error TS2322: Type '"tenant" | "management" | "service_provider" | "admin" | "employee"' is not assignable to type '"tenant" | "management" | "building_employee"'.
  Type '"service_provider"' is not assignable to type '"tenant" | "management" | "building_employee"'.

185               userRole={
                  ~~~~~~~~

  components/notifications/NotificationsList.tsx:24:3
    24   userRole: UserRole;
         ~~~~~~~~
    The expected type comes from property 'userRole' which is declared here on type 'IntrinsicAttributes & NotificationsListProps'

app/(modals)/notifications-hub.tsx:202:15 - error TS2322: Type '"tenant" | "management" | "service_provider" | "admin" | "employee"' is not assignable to type '"tenant" | "management" | "building_employee"'.
  Type '"service_provider"' is not assignable to type '"tenant" | "management" | "building_employee"'.

202               userRole={
                  ~~~~~~~~

  components/notifications/NoticesList.tsx:19:3
    19   userRole: UserRole;
         ~~~~~~~~
    The expected type comes from property 'userRole' which is declared here on type 'IntrinsicAttributes & NoticesListProps'

app/(modals)/request-details.tsx:271:28 - error TS2448: Block-scoped variable 'resolveCommentAuthor' used before its declaration.

271   }, [selectedRequest?.id, resolveCommentAuthor]);
                               ~~~~~~~~~~~~~~~~~~~~

  app/(modals)/request-details.tsx:374:9
    374   const resolveCommentAuthor = useCallback((comment: any): string => {
                ~~~~~~~~~~~~~~~~~~~~
    'resolveCommentAuthor' is declared here.

app/(modals)/request-details.tsx:564:64 - error TS2345: Argument of type 'string' is not assignable to parameter of type '{ decision: JobEstimateStatus; notes?: string; }'.

564               await actions.reviewJobEstimateAsTenant?.(jobId, "approve");
                                                                   ~~~~~~~~~

app/(modals)/request-details.tsx:600:17 - error TS2554: Expected 2 arguments, but got 3.

600                 reason.trim(),
                    ~~~~~~~~~~~~~

app/(modals)/request-details.tsx:1279:41 - error TS2339: Property 'buildingName' does not exist on type '{ container: { flex: number; backgroundColor: string; }; keyboardAvoidingView: { flex: number; }; header: { flexDirection: "row"; alignItems: "center"; justifyContent: "space-between"; paddingHorizontal: number; paddingVertical: number; backgroundColor: string; borderBottomWidth: number; borderBottomColor: string; }...'.

1279                     <Text style={styles.buildingName}>
                                             ~~~~~~~~~~~~

app/(modals)/request-details.tsx:1285:39 - error TS2339: Property 'locationDetails' does not exist on type '{ container: { flex: number; backgroundColor: string; }; keyboardAvoidingView: { flex: number; }; header: { flexDirection: "row"; alignItems: "center"; justifyContent: "space-between"; paddingHorizontal: number; paddingVertical: number; backgroundColor: string; borderBottomWidth: number; borderBottomColor: string; }...'.

1285                   <View style={styles.locationDetails}>
                                           ~~~~~~~~~~~~~~~

app/(modals)/request-details.tsx:1287:43 - error TS2339: Property 'locationDetailRow' does not exist on type '{ container: { flex: number; backgroundColor: string; }; keyboardAvoidingView: { flex: number; }; header: { flexDirection: "row"; alignItems: "center"; justifyContent: "space-between"; paddingHorizontal: number; paddingVertical: number; backgroundColor: string; borderBottomWidth: number; borderBottomColor: string; }...'.

1287                       <View style={styles.locationDetailRow}>
                                               ~~~~~~~~~~~~~~~~~

app/(modals)/request-details.tsx:1288:45 - error TS2339: Property 'locationDetailLabel' does not exist on type '{ container: { flex: number; backgroundColor: string; }; keyboardAvoidingView: { flex: number; }; header: { flexDirection: "row"; alignItems: "center"; justifyContent: "space-between"; paddingHorizontal: number; paddingVertical: number; backgroundColor: string; borderBottomWidth: number; borderBottomColor: string; }...'.

1288                         <Text style={styles.locationDetailLabel}>Unit:</Text>
                                                 ~~~~~~~~~~~~~~~~~~~

app/(modals)/request-details.tsx:1289:45 - error TS2339: Property 'locationDetailValue' does not exist on type '{ container: { flex: number; backgroundColor: string; }; keyboardAvoidingView: { flex: number; }; header: { flexDirection: "row"; alignItems: "center"; justifyContent: "space-between"; paddingHorizontal: number; paddingVertical: number; backgroundColor: string; borderBottomWidth: number; borderBottomColor: string; }...'.

1289                         <Text style={styles.locationDetailValue}>
                                                 ~~~~~~~~~~~~~~~~~~~

app/(modals)/request-details.tsx:1297:43 - error TS2339: Property 'locationDetailRow' does not exist on type '{ container: { flex: number; backgroundColor: string; }; keyboardAvoidingView: { flex: number; }; header: { flexDirection: "row"; alignItems: "center"; justifyContent: "space-between"; paddingHorizontal: number; paddingVertical: number; backgroundColor: string; borderBottomWidth: number; borderBottomColor: string; }...'.

1297                       <View style={styles.locationDetailRow}>
                                               ~~~~~~~~~~~~~~~~~

app/(modals)/request-details.tsx:1298:45 - error TS2339: Property 'locationDetailLabel' does not exist on type '{ container: { flex: number; backgroundColor: string; }; keyboardAvoidingView: { flex: number; }; header: { flexDirection: "row"; alignItems: "center"; justifyContent: "space-between"; paddingHorizontal: number; paddingVertical: number; backgroundColor: string; borderBottomWidth: number; borderBottomColor: string; }...'.

1298                         <Text style={styles.locationDetailLabel}>Tower:</Text>
                                                 ~~~~~~~~~~~~~~~~~~~

app/(modals)/request-details.tsx:1299:45 - error TS2339: Property 'locationDetailValue' does not exist on type '{ container: { flex: number; backgroundColor: string; }; keyboardAvoidingView: { flex: number; }; header: { flexDirection: "row"; alignItems: "center"; justifyContent: "space-between"; paddingHorizontal: number; paddingVertical: number; backgroundColor: string; borderBottomWidth: number; borderBottomColor: string; }...'.

1299                         <Text style={styles.locationDetailValue}>
                                                 ~~~~~~~~~~~~~~~~~~~

app/(modals)/request-provider-access.tsx:84:18 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"admin"' have no overlap.

84           (u) => u.role === "admin" || u.role === "super_admin"
                    ~~~~~~~~~~~~~~~~~~

app/(modals)/request-provider-access.tsx:84:40 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"super_admin"' have no overlap.

84           (u) => u.role === "admin" || u.role === "super_admin"
                                          ~~~~~~~~~~~~~~~~~~~~~~~~

app/(tenant)/profile.tsx:428:9 - error TS2769: No overload matches this call.
  Overload 1 of 2, '(props: ModalProps): Modal', gave the following error.
    Type '(force?: boolean) => void' is not assignable to type '(event: NativeSyntheticEvent<any>) => void'.
      Types of parameters 'force' and 'event' are incompatible.
        Type 'NativeSyntheticEvent<any>' is not assignable to type 'boolean'.
  Overload 2 of 2, '(props: ModalProps, context: any): Modal', gave the following error.
    Type '(force?: boolean) => void' is not assignable to type '(event: NativeSyntheticEvent<any>) => void'.
      Types of parameters 'force' and 'event' are incompatible.
        Type 'NativeSyntheticEvent<any>' is not assignable to type 'boolean'.

428         onRequestClose={handleClosePasswordModal}
            ~~~~~~~~~~~~~~

  node_modules/react-native/Libraries/Modal/Modal.d.ts:42:3
    42   onRequestClose?: ((event: NativeSyntheticEvent<any>) => void) | undefined;
         ~~~~~~~~~~~~~~
    The expected type comes from property 'onRequestClose' which is declared here on type 'IntrinsicAttributes & IntrinsicClassAttributes<Modal> & Readonly<ModalProps>'
  node_modules/react-native/Libraries/Modal/Modal.d.ts:42:3
    42   onRequestClose?: ((event: NativeSyntheticEvent<any>) => void) | undefined;
         ~~~~~~~~~~~~~~
    The expected type comes from property 'onRequestClose' which is declared here on type 'IntrinsicAttributes & IntrinsicClassAttributes<Modal> & Readonly<ModalProps>'

app/(tenant)/profile.tsx:437:13 - error TS2322: Type '(force?: boolean) => void' is not assignable to type '(event: GestureResponderEvent) => void'.
  Types of parameters 'force' and 'event' are incompatible.
    Type 'GestureResponderEvent' is not assignable to type 'boolean'.

437             onPress={handleClosePasswordModal}
                ~~~~~~~

  node_modules/react-native/Libraries/Components/Touchable/TouchableWithoutFeedback.d.ts:113:3
    113   onPress?: ((event: GestureResponderEvent) => void) | undefined;
          ~~~~~~~
    The expected type comes from property 'onPress' which is declared here on type 'IntrinsicAttributes & TouchableOpacityProps & RefAttributes<View>'

app/(tenant)/profile.tsx:459:17 - error TS2322: Type '(force?: boolean) => void' is not assignable to type '(event: GestureResponderEvent) => void'.
  Types of parameters 'force' and 'event' are incompatible.
    Type 'GestureResponderEvent' is not assignable to type 'boolean'.

459                 onPress={handleClosePasswordModal}
                    ~~~~~~~

  node_modules/react-native/Libraries/Components/Touchable/TouchableWithoutFeedback.d.ts:113:3
    113   onPress?: ((event: GestureResponderEvent) => void) | undefined;
          ~~~~~~~
    The expected type comes from property 'onPress' which is declared here on type 'IntrinsicAttributes & TouchableOpacityProps & RefAttributes<View>'

app/(tenant)/profile.tsx:549:19 - error TS2322: Type '(force?: boolean) => void' is not assignable to type '(event: GestureResponderEvent) => void'.
  Types of parameters 'force' and 'event' are incompatible.
    Type 'GestureResponderEvent' is not assignable to type 'boolean'.

549                   onPress={handleClosePasswordModal}
                      ~~~~~~~

  node_modules/react-native/Libraries/Components/Touchable/TouchableWithoutFeedback.d.ts:113:3
    113   onPress?: ((event: GestureResponderEvent) => void) | undefined;
          ~~~~~~~
    The expected type comes from property 'onPress' which is declared here on type 'IntrinsicAttributes & TouchableOpacityProps & RefAttributes<View>'

app/(tenant)/requests.tsx:364:64 - error TS2345: Argument of type 'string' is not assignable to parameter of type '{ decision: JobEstimateStatus; notes?: string; }'.

364               await actions.reviewJobEstimateAsTenant?.(jobId, "approve");
                                                                   ~~~~~~~~~

app/(tenant)/requests.tsx:396:17 - error TS2554: Expected 2 arguments, but got 3.

396                 reason.trim(),
                    ~~~~~~~~~~~~~

app/_layout.tsx:52:17 - error TS2367: This comparison appears to be unintentional because the types '"maintenance" | "activity" | "buildings" | "jobs" | "requests" | "units" | "visitors" | "profile" | "amenities" | "managers" | "shifts" | "more" | "workforce" | "billing" | "parcels" | "my-bookings" | "my-ratings" | "new-request"' and '"index"' have no overlap.

52                 segments[1] === "index" ||
                   ~~~~~~~~~~~~~~~~~~~~~~~

app/_layout.tsx:53:17 - error TS2367: This comparison appears to be unintentional because the types '"maintenance" | "activity" | "buildings" | "jobs" | "requests" | "units" | "visitors" | "profile" | "amenities" | "managers" | "shifts" | "more" | "workforce" | "billing" | "parcels" | "my-bookings" | "my-ratings" | "new-request"' and '""' have no overlap.

53                 segments[1] === "")));
                   ~~~~~~~~~~~~~~~~~~

components/notifications/NoticeItem.tsx:80:19 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"admin"' have no overlap.

80   const isAdmin = userRole === "admin" || userRole === "management";
                     ~~~~~~~~~~~~~~~~~~~~

components/notifications/NoticesList.tsx:39:19 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"admin"' have no overlap.

39   const isAdmin = userRole === "admin" || userRole === "management";
                     ~~~~~~~~~~~~~~~~~~~~

components/ui/SideMenu.tsx:409:5 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"super_admin"' have no overlap.

409     currentUser?.role === "super_admin"
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

components/ui/SideMenu.tsx:411:9 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"admin"' have no overlap.

411       : currentUser?.role === "admin"
            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

components/ui/SideMenu.tsx:417:15 - error TS2367: This comparison appears to be unintentional because the types '"tenant"' and '"service_provider"' have no overlap.

417             : currentUser?.role === "service_provider"
                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

components/ui/SideMenu.tsx:419:17 - error TS2367: This comparison appears to be unintentional because the types '"tenant"' and '"employee"' have no overlap.    

419               : currentUser?.role === "employee"
                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/auth-context.tsx:176:5 - error TS2322: Type '"super_admin"' is not assignable to type '"tenant" | "management" | "building_employee"'.

176     return "super_admin";
        ~~~~~~

lib/context/auth-context.tsx:180:5 - error TS2322: Type '"admin"' is not assignable to type '"tenant" | "management" | "building_employee"'.

180     return "admin";
        ~~~~~~

lib/context/auth-context.tsx:188:5 - error TS2322: Type '"service_provider"' is not assignable to type '"tenant" | "management" | "building_employee"'.

188     return "service_provider";
        ~~~~~~

lib/context/auth-context.tsx:196:5 - error TS2322: Type '"employee"' is not assignable to type '"tenant" | "management" | "building_employee"'.

196     return "employee";
        ~~~~~~

lib/context/auth-context.tsx:558:64 - error TS2339: Property 'data' does not exist on type 'AuthResponse'.

558         const accessToken = response?.accessToken ?? response?.data?.accessToken;
                                                                   ~~~~

lib/context/auth-context.tsx:559:66 - error TS2339: Property 'data' does not exist on type 'AuthResponse'.

559         const refreshToken = response?.refreshToken ?? response?.data?.refreshToken;
                                                                     ~~~~

lib/context/auth-context.tsx:560:57 - error TS2339: Property 'data' does not exist on type 'AuthResponse'.

560         const payloadUser = response?.user ?? response?.data?.user;
                                                            ~~~~

lib/context/auth-context.tsx:567:23 - error TS2339: Property 'data' does not exist on type 'AuthResponse'.

567             response?.data && typeof response.data === "object"
                          ~~~~

lib/context/auth-context.tsx:567:47 - error TS2339: Property 'data' does not exist on type 'AuthResponse'.

567             response?.data && typeof response.data === "object"
                                                  ~~~~

lib/context/auth-context.tsx:568:38 - error TS2339: Property 'data' does not exist on type 'AuthResponse'.

568               ? Object.keys(response.data)
                                         ~~~~

lib/context/auth-context.tsx:779:18 - error TS2678: Type '"admin"' is not comparable to type '"tenant" | "management" | "building_employee"'.

779             case "admin":
                     ~~~~~~~

lib/context/connected-app-provider.tsx:647:16 - error TS2678: Type '"employee"' is not comparable to type '"tenant" | "management" | "building_employee"'.      

647           case "employee":
                   ~~~~~~~~~~

lib/context/connected-app-provider.tsx:653:16 - error TS2678: Type '"admin"' is not comparable to type '"tenant" | "management" | "building_employee"'.

653           case "admin":
                   ~~~~~~~

lib/context/connected-app-provider.tsx:654:16 - error TS2678: Type '"super_admin"' is not comparable to type '"tenant" | "management" | "building_employee"'.   

654           case "super_admin":
                   ~~~~~~~~~~~~~

lib/context/connected-app-provider.tsx:1208:7 - error TS1117: An object literal cannot have multiple properties with the same name.

1208       getManagedBuildingIds,
           ~~~~~~~~~~~~~~~~~~~~~

lib/context/connected-app-provider.tsx:1209:7 - error TS1117: An object literal cannot have multiple properties with the same name.

1209       getManagedBuildings,
           ~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:201:23 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"admin"' have no overlap.

201       const isAdmin = role === "admin" || role === "super_admin";
                          ~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:201:43 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"super_admin"' have no overlap.

201       const isAdmin = role === "admin" || role === "super_admin";
                                              ~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:316:13 - error TS2561: Object literal may only specify known properties, but 'requestedBy' does not exist in type 'Job'. Did you mean to write 'requestId'?

316             requestedBy: jobData.requestedBy,
                ~~~~~~~~~~~

lib/context/modules/jobs.ts:316:34 - error TS2551: Property 'requestedBy' does not exist on type 'CreateJobDTO'. Did you mean 'requestId'?

316             requestedBy: jobData.requestedBy,
                                     ~~~~~~~~~~~

  lib/types/index.ts:1366:3
    1366   requestId?: string;
           ~~~~~~~~~
    'requestId' is declared here.

lib/context/modules/jobs.ts:317:38 - error TS2339: Property 'requestedByName' does not exist on type 'CreateJobDTO'.

317             requestedByName: jobData.requestedByName,
                                         ~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:320:29 - error TS2339: Property 'status' does not exist on type 'CreateJobDTO'.

320             status: jobData.status ?? "pending",
                                ~~~~~~

lib/context/modules/jobs.ts:324:43 - error TS2339: Property 'assignedEmployeeId' does not exist on type 'CreateJobDTO'.

324             assignedToEmployeeId: jobData.assignedEmployeeId,
                                              ~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:325:45 - error TS2339: Property 'assignedEmployeeName' does not exist on type 'CreateJobDTO'.

325             assignedToEmployeeName: jobData.assignedEmployeeName,
                                                ~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:329:37 - error TS2551: Property 'estimatedHours' does not exist on type 'CreateJobDTO'. Did you mean 'estimatedCost'?

329             estimatedHours: jobData.estimatedHours,
                                        ~~~~~~~~~~~~~~

  lib/types/index.ts:1378:3
    1378   estimatedCost?: number;
           ~~~~~~~~~~~~~
    'estimatedCost' is declared here.

lib/context/modules/jobs.ts:330:38 - error TS2339: Property 'completionNotes' does not exist on type 'CreateJobDTO'.

330             completionNotes: jobData.completionNotes,
                                         ~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:334:38 - error TS2339: Property 'assignmentQueue' does not exist on type 'CreateJobDTO'.

334             assignmentQueue: jobData.assignmentQueue ?? [],
                                         ~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:394:17 - error TS2353: Object literal may only specify known properties, and 'cancelledReason' does not exist in type 'Job'.        

394                 cancelledReason:
                    ~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:395:78 - error TS2339: Property 'cancelledReason' does not exist on type 'Job'.

395                   status === "cancelled" ? context?.cancellationReason : job.cancelledReason,
                                                                                 ~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:743:9 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"service_provider"' have no overlap.

743         auth.currentUser.role === "service_provider" &&
            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:843:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"employee"' have no overlap.

843       if (!auth.currentUser || auth.currentUser.role !== "employee") {
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:888:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"employee"' have no overlap.

888       if (!auth.currentUser || auth.currentUser.role !== "employee") {
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:935:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"employee"' have no overlap.

935       if (!auth.currentUser || auth.currentUser.role !== "employee") {
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:949:19 - error TS2561: Object literal may only specify known properties, but 'workStartedAt' does not exist in type 'Job'. Did you mean to write 'startedAt'?

949                   workStartedAt: new Date().toISOString(),
                      ~~~~~~~~~~~~~

lib/context/modules/jobs.ts:975:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"employee"' have no overlap.

975       if (!auth.currentUser || auth.currentUser.role !== "employee") {
                                   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:988:19 - error TS2353: Object literal may only specify known properties, and 'photos' does not exist in type 'Job'.

988                   photos: [
                      ~~~~~~

lib/context/modules/jobs.ts:989:29 - error TS2339: Property 'photos' does not exist on type 'Job'.

989                     ...(job.photos ?? []),
                                ~~~~~~

lib/context/modules/jobs.ts:1019:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"employee"' have no overlap.

1019       if (!auth.currentUser || auth.currentUser.role !== "employee") {
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1071:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"employee"' have no overlap.

1071       if (!auth.currentUser || auth.currentUser.role !== "employee") {
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1084:19 - error TS2322: Type '"completed" | "follow-up"' is not assignable to type '"pending" | "assigned" | "in-progress" | "completed" | "cancelled"'.
  Type '"follow-up"' is not assignable to type '"pending" | "assigned" | "in-progress" | "completed" | "cancelled"'.

1084                   status: payload.requiresFollowUp ? "follow-up" : "completed",
                       ~~~~~~

  lib/types/index.ts:961:3
    961   status: "pending" | "assigned" | "in-progress" | "completed" | "cancelled";
          ~~~~~~
    The expected type comes from property 'status' which is declared here on type 'Job'

lib/context/modules/jobs.ts:1087:69 - error TS2339: Property 'completionAttachments' does not exist on type 'Job'.

1087                   completionAttachments: payload.attachments ?? job.completionAttachments,
                                                                         ~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1122:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"employee"' have no overlap.

1122       if (!auth.currentUser || auth.currentUser.role !== "employee") {
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1227:9 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"employee"' have no overlap.

1227         employeeUser.role !== "employee" ||
             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1278:33 - error TS2339: Property 'addNotification' does not exist on type 'NotificationsActions'.

1278           notifications.actions.addNotification({
                                     ~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1297:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"service_provider"' have no overlap.

1297       if (!auth.currentUser || auth.currentUser.role !== "service_provider") {
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1346:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"service_provider"' have no overlap.

1346       if (!auth.currentUser || auth.currentUser.role !== "service_provider") {
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1396:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"service_provider"' have no overlap.

1396       if (!auth.currentUser || auth.currentUser.role !== "service_provider") {
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1457:32 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"service_provider"' have no overlap.

1457       if (!auth.currentUser || auth.currentUser.role !== "service_provider") {
                                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1486:21 - error TS2367: This comparison appears to be unintentional because the types 'JobEstimateStatus' and '"approved"' have no overlap.

1486                     decision === "approved" ? auth.currentUser!.id : undefined,
                         ~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1488:21 - error TS2367: This comparison appears to be unintentional because the types 'JobEstimateStatus' and '"approved"' have no overlap.

1488                     decision === "approved"
                         ~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1492:36 - error TS2367: This comparison appears to be unintentional because the types 'JobEstimateStatus' and '"rejected"' have no overlap.

1492                   rejectionReason: decision === "rejected" ? reason : undefined,
                                        ~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/jobs.ts:1497:19 - error TS2367: This comparison appears to be unintentional because the types 'JobEstimateStatus' and '"approved"' have no overlap.

1497               if (decision === "approved") {
                       ~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/property.ts:859:6 - error TS2448: Block-scoped variable 'parseNumericId' used before its declaration.

859     [parseNumericId, serviceProviders],
         ~~~~~~~~~~~~~~

  lib/context/modules/property.ts:862:9
    862   const parseNumericId = useCallback((value: string | number, fieldName: string): number => {
                ~~~~~~~~~~~~~~
    'parseNumericId' is declared here.

lib/context/modules/property.ts:1039:11 - error TS2322: Type '"service_provider"' is not assignable to type '"tenant" | "management" | "building_employee"'.    

1039           role: "service_provider",
               ~~~~

  lib/types/index.ts:9:3
    9   role:
        ~~~~
    The expected type comes from property 'role' which is declared here on type 'User'

lib/context/modules/property.ts:1152:19 - error TS2353: Object literal may only specify known properties, and 'updatedAt' does not exist in type 'ServiceProviderBuildingAssignment'.

1152                   updatedAt: new Date().toISOString(),
                       ~~~~~~~~~

lib/context/modules/property.ts:1855:84 - error TS2367: This comparison appears to be unintentional because the types 'string' and 'number' have no overlap.    

1855         const isCurrentUserAssignment = auth.currentUser.id === String(adminId) || auth.currentUser.id === adminId;
                                                                                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/property.ts:1861:19 - error TS2367: This comparison appears to be unintentional because the types 'string' and 'number' have no overlap.    

1861           match2: auth.currentUser.id === adminId,
                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/context/modules/ratings.ts:110:9 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"super_admin"' have no overlap.

110     if (auth.currentUser.role === "super_admin") {
            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/services/api/admin.ts:59:9 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"admin"' have no overlap.

59     if (userData.role === "admin" || userData.role === "super_admin") {
           ~~~~~~~~~~~~~~~~~~~~~~~~~

lib/services/api/admin.ts:59:38 - error TS2367: This comparison appears to be unintentional because the types '"tenant" | "management" | "building_employee"' and '"super_admin"' have no overlap.

59     if (userData.role === "admin" || userData.role === "super_admin") {
                                        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

lib/services/api/tenants.ts:47:36 - error TS2339: Property 'floor' does not exist on type 'CreateUserDTO'.

47       const floorNumber = userData.floor ? parseInt(userData.floor, 10) : 0;
                                      ~~~~~

lib/services/api/tenants.ts:47:62 - error TS2339: Property 'floor' does not exist on type 'CreateUserDTO'.

47       const floorNumber = userData.floor ? parseInt(userData.floor, 10) : 0;
                                                                ~~~~~

lib/services/api/tenants.ts:54:28 - error TS2339: Property 'name' does not exist on type 'CreateUserDTO'.

54         fullName: userData.name,
                              ~~~~

lib/services/api/tenants.ts:55:31 - error TS2339: Property 'phone' does not exist on type 'CreateUserDTO'.

55         phoneNumber: userData.phone || "",
                                 ~~~~~

lib/services/api/tenants.ts:62:40 - error TS2339: Property 'emergencyContact' does not exist on type 'CreateUserDTO'.

62         emergencyContactName: userData.emergencyContact || "",
                                          ~~~~~~~~~~~~~~~~

lib/services/api/tenants.ts:63:41 - error TS2339: Property 'emergencyPhone' does not exist on type 'CreateUserDTO'.

63         emergencyContactPhone: userData.emergencyPhone || "",
                                           ~~~~~~~~~~~~~~

lib/services/api/tenants.ts:90:20 - error TS2339: Property 'name' does not exist on type 'Partial<CreateUserDTO>'.

90       if (userData.name) payload.fullName = userData.name;
                      ~~~~

lib/services/api/tenants.ts:90:54 - error TS2339: Property 'name' does not exist on type 'Partial<CreateUserDTO>'.

90       if (userData.name) payload.fullName = userData.name;
                                                        ~~~~

lib/services/api/tenants.ts:91:20 - error TS2339: Property 'phone' does not exist on type 'Partial<CreateUserDTO>'.

91       if (userData.phone) payload.phoneNumber = userData.phone;
                      ~~~~~

lib/services/api/tenants.ts:91:58 - error TS2339: Property 'phone' does not exist on type 'Partial<CreateUserDTO>'.

91       if (userData.phone) payload.phoneNumber = userData.phone;
                                                            ~~~~~

lib/services/api/tenants.ts:100:20 - error TS2339: Property 'floor' does not exist on type 'Partial<CreateUserDTO>'.

100       if (userData.floor) payload.floorNumber = parseInt(userData.floor, 10);
                       ~~~~~

lib/services/api/tenants.ts:100:67 - error TS2339: Property 'floor' does not exist on type 'Partial<CreateUserDTO>'.

100       if (userData.floor) payload.floorNumber = parseInt(userData.floor, 10);
                                                                      ~~~~~

lib/services/api/tenants.ts:101:20 - error TS2339: Property 'emergencyContact' does not exist on type 'Partial<CreateUserDTO>'.

101       if (userData.emergencyContact) payload.emergencyContactName = userData.emergencyContact;
                       ~~~~~~~~~~~~~~~~

lib/services/api/tenants.ts:101:78 - error TS2339: Property 'emergencyContact' does not exist on type 'Partial<CreateUserDTO>'.

101       if (userData.emergencyContact) payload.emergencyContactName = userData.emergencyContact;
                                                                                 ~~~~~~~~~~~~~~~~

lib/services/api/tenants.ts:102:20 - error TS2339: Property 'emergencyPhone' does not exist on type 'Partial<CreateUserDTO>'.

102       if (userData.emergencyPhone) payload.emergencyContactPhone = userData.emergencyPhone;
                       ~~~~~~~~~~~~~~

lib/services/api/tenants.ts:102:77 - error TS2339: Property 'emergencyPhone' does not exist on type 'Partial<CreateUserDTO>'.

102       if (userData.emergencyPhone) payload.emergencyContactPhone = userData.emergencyPhone;
                                                                                ~~~~~~~~~~~~~~

lib/services/api/users.ts:214:9 - error TS2554: Expected 1-2 arguments, but got 3.

214         {
            ~
215           headers: {
    ~~~~~~~~~~~~~~~~~~~~
...
217           },
    ~~~~~~~~~~~~
218         }
    ~~~~~~~~~

lib/services/api/users.ts:273:9 - error TS2554: Expected 1-2 arguments, but got 3.

273         {
            ~
274           headers: {
    ~~~~~~~~~~~~~~~~~~~~
...
276           },
    ~~~~~~~~~~~~
277         }
    ~~~~~~~~~

lib/services/api/users.ts:334:9 - error TS2554: Expected 1-2 arguments, but got 3.

334         {
            ~
335           headers: {
    ~~~~~~~~~~~~~~~~~~~~
...
337           },
    ~~~~~~~~~~~~
338         }
    ~~~~~~~~~


Found 123 errors in 23 files.

Errors  Files
     5  app/(buildingEmployee)/jobs.tsx:448
     1  app/(management)/buildings.tsx:287
     3  app/(management)/maintenance/_components/CreateScheduleModal.tsx:34
     3  app/(management)/profile.tsx:59
     1  app/(management)/requests.tsx:2090
     2  app/(modals)/notice-details.tsx:144
     2  app/(modals)/notifications-hub.tsx:185
    11  app/(modals)/request-details.tsx:271
     2  app/(modals)/request-provider-access.tsx:84
     4  app/(tenant)/profile.tsx:428
     2  app/(tenant)/requests.tsx:364
     2  app/_layout.tsx:52
     1  components/notifications/NoticeItem.tsx:80
     1  components/notifications/NoticesList.tsx:39
     4  components/ui/SideMenu.tsx:409
    11  lib/context/auth-context.tsx:176
     5  lib/context/connected-app-provider.tsx:647
    36  lib/context/modules/jobs.ts:201
     5  lib/context/modules/property.ts:859
     1  lib/context/modules/ratings.ts:110
     2  lib/services/api/admin.ts:59
    16  lib/services/api/tenants.ts:47
     3  lib/services/api/users.ts:214