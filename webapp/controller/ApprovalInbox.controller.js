
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, MessageBox, MessageToast, History) {
    "use strict";

    return Controller.extend("leaveui5.controller.ApprovalInbox", {

        onInit: function () {
            this.getView().setModel(
                new JSONModel({ tasks: [] }),
                "inbox"
            );

            this.getView().setModel(
                new JSONModel({}),
                "inboxSelected"
            );

            this._loadTasks();
        },

        onRefresh: function () {
            this._loadTasks();
        },

        _loadTasks: async function () {
            var oView = this.getView();
            var oModel = this.getOwnerComponent().getModel();

            if (!oModel) {
                MessageBox.error(
                    "Default OData model is missing. Check manifest.json."
                );
                return;
            }

            oView.setBusy(true);

            try {
                var oOperation = oModel.bindContext(
                    "/getMyApprovalTasks(...)"
                );

                await oOperation.execute();

                var oResult = oOperation.getBoundContext().getObject();
                var vTasks = oResult && oResult.value !== undefined
                    ? oResult.value
                    : oResult;

                if (typeof vTasks === "string") {
                    vTasks = JSON.parse(vTasks || "[]");
                }

                if (!Array.isArray(vTasks)) {
                    vTasks = vTasks && (
                        vTasks.tasks || vTasks.taskInstances
                    );

                    if (typeof vTasks === "string") {
                        vTasks = JSON.parse(vTasks || "[]");
                    }
                }

                if (!Array.isArray(vTasks)) {
                    vTasks = [];
                }

                console.log("BPA TASK RESPONSE:", vTasks);

                var aTasks = vTasks
                    .filter(function (oTask) {
                        return String(oTask.status || "").toUpperCase() === "READY";
                    })
                    .map(function (oTask) {
                        var oContext =
                            oTask.context ||
                            oTask.workflowContext ||
                            oTask.workflowInstanceContext ||
                            {};

                        var oLeave = oContext.startEvent || oContext;

                        var aRecipients = Array.isArray(oTask.recipientUsers)
                            ? oTask.recipientUsers
                            : [];

                        var oMappedTask = {
                            id: oTask.id || "",
                            status: oTask.status || "",
                            assignedTo: oTask.assignedTo ||
                                aRecipients.join(", ") ||
                                oTask.processor || "",

                            leaveRequestID:
                                oTask.leaveRequestID ||
                                oLeave.leaveRequestID || "",

                            employeeName:
                                oTask.employeeName ||
                                oLeave.employeeName || "",

                            employeeEmail:
                                oTask.employeeEmail ||
                                oLeave.employeeEmail || "",

                            leaveType:
                                oTask.leaveType ||
                                oLeave.leaveType || "",

                            startDate:
                                oTask.startDate ||
                                oLeave.startDate || "",

                            endDate:
                                oTask.endDate ||
                                oLeave.endDate || "",

                            totalDays:
                                oTask.totalDays ??
                                oLeave.totalDays ?? "",

                            reason:
                                oTask.reason ||
                                oLeave.reason || "",

                            raw: oTask
                        };

                        console.log("MAPPED BPA TASK:", oMappedTask);

                        return oMappedTask;
                    });

                oView.getModel("inbox").setProperty("/tasks", aTasks);
                oView.getModel("inboxSelected").setData({});

                MessageToast.show(
                    aTasks.length + " pending approval task(s) loaded"
                );

            } catch (oError) {
                console.error("APPROVAL INBOX ERROR:", oError);

                MessageBox.error(
                    "Unable to fetch approval tasks from CAP.\n" +
                    (oError.message || "Unknown error")
                );
            } finally {
                oView.setBusy(false);
            }
        },

        onTaskSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");

            if (!oItem) {
                return;
            }

            var oContext = oItem.getBindingContext("inbox");

            if (oContext) {
                var oTask = oContext.getObject();

                console.log("SELECTED TASK DETAILS:", oTask);

                this.getView()
                    .getModel("inboxSelected")
                    .setData(oTask);
            }
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.back();
            } else {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("RouteView1", {}, true);
            }
        },

        onApproveTask: function () {
            this._processInboxDecision("Approve");
        },

        onRejectTask: function () {
            this._processInboxDecision("Reject");
        },

        _processInboxDecision: function (sDecision) {
            const oSelectedModel = this.getView().getModel("inboxSelected");
            const oTask = oSelectedModel.getData();

            if (!oTask || !oTask.leaveRequestID || !oTask.id) {
                sap.m.MessageBox.error(
                    "Please select an approval task first."
                );
                return;
            }

            const oModel = this.getView().getModel();

            const oAction = oModel.bindContext(
                "/processInboxDecision(...)"
            );

            oAction.setParameter(
                "leaveRequestID",
                oTask.leaveRequestID
            );

            oAction.setParameter(
                "taskID",
                oTask.id
            );

            oAction.setParameter(
                "decision",
                sDecision
            );

            oAction.execute()
                .then(() => {
                    sap.m.MessageToast.show(
                        "Leave request " + sDecision.toLowerCase() + "d successfully."
                    );

                    oSelectedModel.setData({});

                    return this._loadTasks();
                })
                .catch((oError) => {
                    sap.m.MessageBox.error(
                        "Unable to " + sDecision.toLowerCase() +
                        " leave request.\n" + oError.message
                    );
                });
        }

    });
});
