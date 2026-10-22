sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("leaveui5.controller.View1", {

        onRefresh: function () {
            var oTable = this.byId("leaveRequestsTable");
            var oBinding = oTable.getBinding("items");

            if (oBinding) {
                oBinding.refresh();
                MessageToast.show("Leave requests refreshed");
            }
        },

        onSubmitLeaveRequest: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var sLeaveRequestID = oContext.getProperty("ID");
            var sStatus = oContext.getProperty("status");

            if (sStatus !== "Submitted") {
                MessageBox.warning(
                    "Only Submitted leave requests can be sent for approval."
                );
                return;
            }

            MessageBox.confirm(
                "Do you want to send this leave request for approval?",
                {
                    title: "Submit Leave Request",
                    actions: [
                        MessageBox.Action.YES,
                        MessageBox.Action.NO
                    ],
                    emphasizedAction: MessageBox.Action.YES,

                    onClose: async function (sAction) {
                        if (sAction !== MessageBox.Action.YES) {
                            return;
                        }

                        var oModel = this.getView().getModel();
                        var oOperation = oModel.bindContext(
                            "/submitLeaveRequest(...)"
                        );

                        try {
                            oOperation.setParameter(
                                "leaveRequestID",
                                sLeaveRequestID
                            );

                            await oOperation.execute();

                            MessageBox.success(
                                "Leave request has been sent for approval."
                            );

                            this.byId("leaveRequestsTable")
                                .getBinding("items")
                                .refresh();

                        } catch (oError) {
                            MessageBox.error(
                                oError.message ||
                                "Unable to submit the leave request."
                            );
                        } finally {
                            oOperation.destroy();
                        }
                    }.bind(this)
                }
            );
        }

    });
});
