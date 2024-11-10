import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Button, MenuItem, Select, FormControl, InputLabel, TextField, Dialog, DialogActions, DialogContent, DialogTitle, Autocomplete, Switch, FormControlLabel, Card, CardContent, Box, Divider } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import axios from 'axios';
import io from 'socket.io-client';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// Create a custom RTL theme for Material UI
const theme = createTheme({
  direction: 'rtl', // Set direction to rtl
});

// Define the base URL as a variable
const BASE_URL = 'https://baraalive.onrender.com';

const App = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newOrder, setNewOrder] = useState({ item: null, quantity: 1 });
  const [selectedUserOrders, setSelectedUserOrders] = useState([]);
  const [selectedAllOrders, setSelectedAllOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [isGridViewAllOrders, setIsGridViewAllOrders] = useState(true); // State to toggle grid or list view for All Orders

  useEffect(() => {
    // Fetch users, orders, and items on initial load
    axios.get(`${BASE_URL}/users`)
      .then(response => setUsers(response.data))
      .catch(error => console.error('Error fetching users:', error));

    axios.get(`${BASE_URL}/orders`)
      .then(response => setAllOrders(response.data))
      .catch(error => console.error('Error fetching all orders:', error));

    axios.get(`${BASE_URL}/items`)  // Fetch the items list
      .then(response => setItems(response.data))
      .catch(error => console.error('Error fetching items:', error));

    // WebSocket connection for live updates
    const socket = io('https://baraalive.onrender.com');

    socket.on('order-updated', (updatedOrders) => {
      setAllOrders(updatedOrders);
      if (selectedUser) {
        const userOrders = updatedOrders.filter(order => order.userId === selectedUser.id);
        setUserOrders(userOrders);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedUser]);

  const handleUserSelect = (event) => {
    const userId = event.target.value;
    setSelectedUser(users.find(user => user.id === userId));

    axios.get(`${BASE_URL}/orders/${userId}`)
      .then(response => setUserOrders(response.data))
      .catch(error => console.error('Error fetching user orders:', error));
  };

  const handleAddOrder = () => {
    if (!newOrder.item || newOrder.quantity <= 0) {
      alert("Please fill out the item and quantity.");
      return;
    }

    const orderData = {
      userId: selectedUser.id,
      item: newOrder.item.name, // Send only the item name
      quantity: newOrder.quantity,
    };

    axios.post(`${BASE_URL}/order`, orderData)
      .then(() => {
        setOpenAddDialog(false); // Close dialog after adding
        setNewOrder({ item: null, quantity: 1 }); // Reset form
      })
      .catch((error) => console.error('Error adding order:', error));
  };

  const handleDeleteSelectedUserOrders = () => {
    selectedUserOrders.forEach(orderId => {
      axios.delete(`${BASE_URL}/order/${orderId}`)
        .then(() => {
          setUserOrders(userOrders.filter(order => order.id !== orderId));
          setAllOrders(allOrders.filter(order => order.id !== orderId));
        })
        .catch((error) => console.error('Error deleting selected user order:', error));
    });
    setSelectedUserOrders([]); // Clear selected orders after deletion
  };

  const handleDeleteSelectedAllOrders = () => {
    selectedAllOrders.forEach(orderId => {
      axios.delete(`${BASE_URL}/order/${orderId}`)
        .then(() => {
          setAllOrders(allOrders.filter(order => order.id !== orderId));
          setUserOrders(userOrders.filter(order => order.id !== orderId));
        })
        .catch((error) => console.error('Error deleting selected order from all orders:', error));
    });
    setSelectedAllOrders([]); // Clear selected orders after deletion
  };

  const handleUpdateOrder = (updatedOrder) => {
    axios.post(`${BASE_URL}/order`, updatedOrder)
      .then(() => {
        const updatedUserOrders = userOrders.map(order =>
          order.id === updatedOrder.id ? updatedOrder : order
        );
        setUserOrders(updatedUserOrders);

        const updatedAllOrders = allOrders.map(order =>
          order.id === updatedOrder.id ? updatedOrder : order
        );
        setAllOrders(updatedAllOrders);
      })
      .catch((error) => console.error('Error updating order:', error));
  };

  const renderAllOrdersGrid = () => {
    const allOrdersColumns = [
      {
        headerName: 'اختيار',
        field: 'select',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'المستخدم',
        field: 'user',
        valueGetter: (params) => {
          const user = users.find(u => u.id === params.data.userId);
          return user ? user.name : 'غير معروف';
        },
        cellStyle: { textAlign: 'right' }
      },
      {
        headerName: 'الطلب والكمية والوقت',
        children: [
          { 
            headerName: 'الطلب',
            field: 'item',
            cellStyle: { textAlign: 'right' }
          },
          {
            headerName: 'الكمية',
            field: 'quantity',
            cellStyle: { textAlign: 'right' }
          },
          {
            headerName: 'الوقت',
            field: 'timestamp',
            valueGetter: (params) => {
              const timestamp = params.data.timestamp;
              const date = new Date(timestamp);
              if (isNaN(date.getTime())) {
                return 'تاريخ غير صحيح';
              }
              return date.toLocaleString();
            },
            cellStyle: { textAlign: 'right' }
          }
        ]
      },
    ];

    return (
      <div className="ag-theme-alpine" style={{ height: 'auto', width: '100%' }}>
        <AgGridReact
          columnDefs={allOrdersColumns}
          rowData={allOrders}
          pagination
          paginationPageSize={5}
          domLayout="autoHeight"
          rowSelection="multiple"
          onSelectionChanged={(event) => {
            const selectedNodes = event.api.getSelectedNodes();
            const selectedData = selectedNodes.map(node => node.data.id);
            setSelectedAllOrders(selectedData);
          }}
        />
      </div>
    );
  };

  const renderAllOrdersList = () => {
    return (
      <Grid container spacing={2}>
        {allOrders.map(order => {
          const user = users.find(u => u.id === order.userId);
          return (
            <Grid item xs={12} sm={6} md={4} key={order.id}>
              <Card variant="outlined" sx={{ padding: 2 }}>
                <CardContent>
                  {/* Display the user's name as the header */}
                  <Typography variant="h6" gutterBottom>{`المستخدم: ${user ? user.name : 'غير معروف'}`}</Typography>
                  <Typography variant="body1">{`الطلب: ${order.item}`}</Typography>
                  <Typography variant="body1">{`الكمية: ${order.quantity}`}</Typography>
                  <Typography variant="body2" color="textSecondary">{`الوقت: ${new Date(order.timestamp).toLocaleString()}`}</Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderUserOrders = () => {
    const userOrderColumns = [
      {
        headerName: 'اختيار',
        field: 'select',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        cellStyle: { textAlign: 'center' }
      },
      {
        headerName: 'الطلب والكمية والوقت',
        children: [
          {
            headerName: 'الطلب',
            field: 'item',
            editable: true,
            cellStyle: { textAlign: 'right' }
          },
          {
            headerName: 'الكمية',
            field: 'quantity',
            editable: true,
            cellStyle: { textAlign: 'right' }
          },
          {
            headerName: 'الوقت',
            field: 'timestamp',
            valueGetter: (params) => {
              const timestamp = params.data.timestamp;
              const date = new Date(timestamp);
              if (isNaN(date.getTime())) {
                return 'تاريخ غير صحيح';
              }
              return date.toLocaleString();
            },
            cellStyle: { textAlign: 'right' }
          }
        ]
      }
    ];

    return (
      <div className="ag-theme-alpine" style={{ height: 'auto', width: '100%' }}>
        <AgGridReact
          columnDefs={userOrderColumns}
          rowData={userOrders}
          onCellValueChanged={(event) => handleUpdateOrder(event.data)}
          pagination
          paginationPageSize={5}
          domLayout="autoHeight"
          rowSelection="multiple"
          onSelectionChanged={(event) => {
            const selectedNodes = event.api.getSelectedNodes();
            const selectedData = selectedNodes.map(node => node.data.id);
            setSelectedUserOrders(selectedData);
          }}
        />
      </div>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Container>
        <Typography variant="h3" gutterBottom align="center">
          إدارة الطلبات
        </Typography>

        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>اختر المستخدم</InputLabel>
              <Select
                value={selectedUser ? selectedUser.id : ''}
                onChange={handleUserSelect}
                label="اختر المستخدم"
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Add Order Button */}
          {selectedUser && (
            <Grid item xs={12} md={8}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpenAddDialog(true)}
              >
                إضافة طلب لـ {selectedUser.name}
              </Button>
            </Grid>
          )}

          {/* Delete Selected Orders for User */}
          {selectedUser && selectedUserOrders.length > 0 && (
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleDeleteSelectedUserOrders}
              >
                حذف الطلبات المحددة لـ {selectedUser.name}
              </Button>
            </Grid>
          )}
        </Grid>

        {/* User Orders Table */}
        {selectedUser && renderUserOrders()}

        {/* All Orders Grid/List Switch */}
        <Grid item xs={12} md={12}>
          <FormControlLabel
            control={
              <Switch
                checked={isGridViewAllOrders}
                onChange={() => setIsGridViewAllOrders(!isGridViewAllOrders)}
              />
            }
            label="عرض في شكل جدول"
          />
        </Grid>

        {/* Delete Selected Orders for All Orders */}
        {selectedAllOrders.length > 0 && (
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleDeleteSelectedAllOrders}
            >
              حذف الطلبات المحددة
            </Button>
          </Grid>
        )}

        {/* All Orders Grid or List View */}
        {isGridViewAllOrders ? renderAllOrdersGrid() : renderAllOrdersList()}

        {/* Add Order Dialog */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
          <DialogTitle>إضافة طلب جديد</DialogTitle>
          <DialogContent>
            <Autocomplete
              options={items.filter(item => item.name !== "water")}
              getOptionLabel={(option) => option.name}
              value={newOrder.item}
              onChange={(event, newValue) => setNewOrder({ ...newOrder, item: newValue })}
              renderInput={(params) => <TextField {...params} label="الطلب" variant="outlined" fullWidth />}
            />
            <TextField
              label="الكمية"
              type="number"
              variant="outlined"
              fullWidth
              value={newOrder.quantity}
              onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
              style={{ marginTop: 16 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)} color="primary">
              إلغاء
            </Button>
            <Button onClick={handleAddOrder} color="primary">
              إضافة طلب
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default App;
