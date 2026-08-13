import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Map as MapIcon, Plus, Trash2, Loader } from 'lucide-react';
import SaveButton from './SaveButton';
import airportsData from '../data/airports.json';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet marker icons for react-leaflet in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
const fetchFullAddress = async (lat, lon) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lon}`);
    const data = await res.json();
    if (data && data.address) {
      const addr = data.address;
      const street = (addr.house_number ? `${addr.house_number} ` : '') + (addr.road || addr.pedestrian || addr.footway || '');
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.suburb || addr.county || '';
      const state = addr.state || addr.region || '';
      const zip = addr.postcode || '';
      return { street, city, state, zip };
    }
  } catch (e) {
    console.error('Reverse geocode failed:', e);
  }
  return {};
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

const MapCenterer = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      map.flyTo(coords, 14, { duration: 1.5 });
    }
  }, [coords, map]);
  return null;
};

const LocationsView = () => {
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]);
  const [saved, setSaved] = useState(false);

  // Autocomplete state
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef(null);

  const loadData = () => {
    let usageData = {};
    let storedCustomZones = [];
    try {
      usageData = JSON.parse(localStorage.getItem('locationUsage') || '{}');
      storedCustomZones = JSON.parse(localStorage.getItem('userCustomZones') || '[]');
    } catch (e) {
      console.error(e);
    }

    const usedAirports = airportsData
      .filter(ap => usageData[ap.id] > 0)
      .map(ap => ({
        ...ap,
        isCustom: false,
        usageCount: usageData[ap.id],
        title: ap.name,
        address: `${ap.municipality}, ${ap.state}`,
        addressStreet: '',
        addressCity: ap.municipality || '',
        addressState: ap.state || '',
        addressZip: '',
        contactName: '',
        contactPhone: '',
        hazards: '',
        coordinates: `${ap.lat}, ${ap.lon}`
      }));

    let combined = [...usedAirports];
    
    storedCustomZones.forEach(storedZone => {
      const existingIndex = combined.findIndex(c => c.id === storedZone.id);
      if (existingIndex >= 0) {
        combined[existingIndex] = { ...combined[existingIndex], ...storedZone, usageCount: usageData[storedZone.id] || 0 };
      } else {
        combined.push({
          ...storedZone,
          isCustom: true,
          usageCount: usageData[storedZone.id] || 0
        });
      }
    });

    combined.sort((a, b) => b.usageCount - a.usageCount);
    setLocations(combined);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [allowAddressSuggestions, setAllowAddressSuggestions] = useState(false);

  // Clear suggestions and hide dropdown when a new location is selected
  useEffect(() => {
    setSuggestions([]);
    setShowSuggestions(false);
  }, [selectedLoc]);

  // Debounced address search - only when user has initiated typing
  useEffect(() => {
    if (!allowAddressSuggestions) return;
    if (!addressQuery || addressQuery.length < 4) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(addressQuery)}`);
        const data = await res.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch (e) {
        console.error("Autocomplete failed:", e);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [addressQuery, allowAddressSuggestions]);

  const editCoordinates = editForm?.coordinates;
  useEffect(() => {
    if (editCoordinates) {
      const parts = editCoordinates.split(',').map(p => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setMapCenter(parts);
      }
    }
  }, [editCoordinates]);

  const filteredLocations = locations.filter(loc => 
    loc.id.toLowerCase().includes(search.toLowerCase()) || 
    (loc.title && loc.title.toLowerCase().includes(search.toLowerCase())) ||
    (loc.name && loc.name.toLowerCase().includes(search.toLowerCase()))
  );

  const parseLegacyAddress = (loc) => {
    let parsed = { ...loc };
    if (parsed.address && !parsed.addressStreet && !parsed.addressCity) {
      // Very basic parser for old format "Street, City, ST"
      const parts = parsed.address.split(',').map(s => s.trim());
      if (parts.length === 3) {
        parsed.addressStreet = parts[0];
        parsed.addressCity = parts[1];
        parsed.addressState = parts[2];
      } else if (parts.length === 2) {
        parsed.addressCity = parts[0];
        parsed.addressState = parts[1];
      } else {
        parsed.addressStreet = parsed.address;
      }
    }
    return parsed;
  };

  const handleSelect = async (loc) => {
    let parsedLoc = parseLegacyAddress(loc);
    setSelectedLoc(parsedLoc);
    setEditForm({ ...parsedLoc });
    setAddressQuery(parsedLoc.addressStreet || '');
    setAllowAddressSuggestions(false);
    setShowSuggestions(false);
  };

  const handleAddNew = () => {
    const newId = `CZ-${Date.now().toString().slice(-4)}`;
    const newLoc = {
      id: newId,
      title: 'New Landing Zone',
      address: '',
      addressStreet: '',
      addressCity: '',
      addressState: '',
      addressZip: '',
      coordinates: '',
      contactName: '',
      contactPhone: '',
      hazards: '',
      isCustom: true,
      type: 'custom',
      isNew: true
    };
    setSelectedLoc(newLoc);
    setEditForm(newLoc);
    setAddressQuery('');
  };

  const handleDelete = () => {
    if (!editForm || !editForm.isCustom) return;
    if (!window.confirm(`Are you sure you want to delete ${editForm.title || editForm.id}?`)) return;
    try {
      const storedCustomZones = JSON.parse(localStorage.getItem('userCustomZones') || '[]');
      const updatedZones = storedCustomZones.filter(z => z.id !== editForm.id);
      localStorage.setItem('userCustomZones', JSON.stringify(updatedZones));
      loadData();
      setSelectedLoc(null);
      setEditForm(null);
    } catch {}
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!editForm) return;

    try {
      const storedCustomZones = JSON.parse(localStorage.getItem('userCustomZones') || '[]');
      const existingIndex = storedCustomZones.findIndex(z => z.id === editForm.id);
      
      // Rebuild the unified address string for legacy compatibility in EventModal/Calendar
      const unifiedParts = [];
      if (editForm.addressStreet) unifiedParts.push(editForm.addressStreet);
      if (editForm.addressCity) unifiedParts.push(editForm.addressCity);
      if (editForm.addressState) {
        if (editForm.addressZip) unifiedParts.push(`${editForm.addressState} ${editForm.addressZip}`);
        else unifiedParts.push(editForm.addressState);
      }
      
      const zoneToSave = { 
        ...editForm, 
        address: unifiedParts.join(', '), 
        type: editForm.isCustom ? 'custom' : 'airport' 
      };
      delete zoneToSave.isNew; 

      if (existingIndex >= 0) {
        storedCustomZones[existingIndex] = zoneToSave;
      } else {
        storedCustomZones.push(zoneToSave);
      }

      localStorage.setItem('userCustomZones', JSON.stringify(storedCustomZones));
      
      loadData();
      setSelectedLoc(zoneToSave);
      setSaved(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    const addr = suggestion.address || {};
    
    const street = (addr.house_number ? `${addr.house_number} ` : '') + (addr.road || addr.pedestrian || addr.footway || '');
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.suburb || addr.county || '';
    const state = addr.state || addr.region || '';
    const zip = addr.postcode || '';

    setAddressQuery(street);
    setEditForm(prev => ({
      ...prev,
      addressStreet: street,
      addressCity: city,
      addressState: state,
      addressZip: zip,
      coordinates: `${lat.toFixed(5)}, ${lon.toFixed(5)}`
    }));
    
    setMapCenter([lat, lon]);
    setShowSuggestions(false);
  };

  const handleMapClick = async (lat, lon) => {
    const formattedCoords = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    setEditForm(prev => ({ ...prev, coordinates: formattedCoords }));
    setMapCenter([lat, lon]);
    
    const addr = await fetchFullAddress(lat, lon);
    if (addr && Object.keys(addr).length) {
      const { street, city, state, zip } = addr;
      setAddressQuery(street);
      setEditForm(prev => ({
        ...prev,
        addressStreet: street,
        addressCity: city,
        addressState: state,
        addressZip: zip,
      }));
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' }}>
      {/* LEFT COLUMN: LIST */}
      <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapIcon size={18} /> Locations
          </h3>
          <button onClick={handleAddNew} className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={14} /> New LZ
          </button>
        </div>
        
        <div style={{ position: 'relative', marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Search active locations..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 8px 8px 30px', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
          />
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '10px' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredLocations.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px', fontSize: '0.875rem' }}>
              No active locations found.
            </div>
          ) : (
            filteredLocations.map(loc => (
              <div 
                key={loc.id}
                onClick={() => handleSelect(loc)}
                style={{
                  padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  backgroundColor: selectedLoc?.id === loc.id ? 'var(--primary-light)' : 'white',
                  borderLeft: selectedLoc?.id === loc.id ? '4px solid var(--primary-color)' : '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: '0.875rem' }}>{loc.id}</strong>
                  {loc.isCustom ? 
                    <span style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '10px' }}>Custom</span> : 
                    <span style={{ fontSize: '0.65rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '10px' }}>Airport</span>
                  }
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-color)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {loc.title || loc.name}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: EDITOR */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
        {!selectedLoc ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <MapPin size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
            <h3>Select a Location</h3>
            <p style={{ fontSize: '0.875rem' }}>Click on a location from the left to view or edit its details.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '100%' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '15px', marginBottom: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>
                  {editForm.isNew ? (
                    <input 
                      type="text" 
                      value={editForm.id} 
                      onChange={(e) => setEditForm({...editForm, id: e.target.value.toUpperCase()})}
                      style={{ fontSize: '1.5rem', fontWeight: 'bold', border: 'none', borderBottom: '2px dashed var(--border-color)', width: '150px', outline: 'none' }}
                      placeholder="NEW-ID"
                      required
                    />
                  ) : editForm.id}
                </h2>
                {!editForm.isCustom && <span style={{ fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px' }}>Official Airport Override</span>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Location Name / Title</label>
              <input 
                type="text" 
                value={editForm.title || editForm.name || ''} 
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                required
                style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
              />
            </div>

            <div className="location-editor-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {/* Data Fields */}
              <div style={{ flex: '1 1 450px', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Structured Address */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-color)' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-color)' }}>Physical Address</label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }} ref={dropdownRef}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>Street Address</label>
                    <input 
                      type="text" 
                      value={addressQuery} 
                      onChange={(e) => {
                        setAddressQuery(e.target.value);
                        setEditForm({ ...editForm, addressStreet: e.target.value });
                        setAllowAddressSuggestions(true);
                        setShowSuggestions(true);
                        setSaved(false);
                      }}
                      onClick={() => { if (!addressQuery) setShowSuggestions(true); }}
                      placeholder="Start typing to search..."
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                    />
                    {isSearchingAddress && (
                      <Loader size={16} color="var(--primary-color)" style={{ position: 'absolute', right: '10px', top: '30px', animation: 'spin 1s linear infinite' }} />
                    )}

                    {showSuggestions && suggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 50, boxShadow: 'var(--shadow-md)', maxHeight: '200px', overflowY: 'auto' }}>
                         {suggestions.map((sug, i) => {
                           const addr = sug.address || {};
                           const streetNum = addr.house_number ? `${addr.house_number}` : '';
                           const street = addr.road || addr.pedestrian || addr.footway || '';
                           const streetFull = streetNum ? `${streetNum} ${street}`.trim() : street;
                           const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.suburb || addr.county || '';
                           const state = addr.state || addr.region || '';
                           const zip = addr.postcode || '';
                           const country = addr.country || '';
                           const parts = [streetFull, city, state, zip, country].filter(p => p);
                           const display = parts.join(', ');
                           return (
                             <div 
                               key={i} 
                               onClick={() => handleSuggestionClick(sug)}
                               style={{ padding: '8px 10px', borderBottom: '1px solid #eee', cursor: 'pointer', fontSize: '0.75rem' }}
                             >
                               <strong>{display}</strong>
                             </div>
                           );
                         })}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 2, minWidth: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>City</label>
                      <input 
                        type="text" 
                        value={editForm.addressCity || ''} 
                        onChange={(e) => setEditForm({...editForm, addressCity: e.target.value})}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>State</label>
                      <input 
                        type="text" 
                        value={editForm.addressState || ''} 
                        onChange={(e) => setEditForm({...editForm, addressState: e.target.value})}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>ZIP</label>
                      <input 
                        type="text" 
                        value={editForm.addressZip || ''} 
                        onChange={(e) => setEditForm({...editForm, addressZip: e.target.value})}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>GPS Coordinates (Lat, Lon)</label>
                  <input 
                    type="text" 
                    value={editForm.coordinates || ''} 
                    onChange={(e) => setEditForm({...editForm, coordinates: e.target.value})}
                    placeholder="e.g. 41.40338, 2.17403"
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click the map to automatically set coordinates!</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Contact Name</label>
                    <input 
                      type="text" 
                      value={editForm.contactName || ''} 
                      onChange={(e) => setEditForm({...editForm, contactName: e.target.value})}
                      style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Contact Phone</label>
                    <input 
                      type="text" 
                      value={editForm.contactPhone || ''} 
                      onChange={(e) => setEditForm({...editForm, contactPhone: e.target.value})}
                      style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-color)' }}>Hazards / Notes</label>
                  <textarea 
                    value={editForm.hazards || ''} 
                    onChange={(e) => setEditForm({...editForm, hazards: e.target.value})}
                    placeholder="e.g. Unlit towers 1nm east, birds near approach end..."
                    style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', minHeight: '100px', resize: 'vertical', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Map View */}
              <div className="location-map-container" style={{ flex: '1 1 300px', minHeight: '300px', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {editForm.coordinates && (
                     <Marker position={mapCenter} />
                  )}
                  <MapClickHandler onMapClick={handleMapClick} />
                  <MapCenterer coords={mapCenter} />
                </MapContainer>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                {editForm.isCustom && !editForm.isNew && (
                  <button type="button" className="btn btn-outline" style={{ color: 'red', borderColor: 'red', display: 'flex', alignItems: 'center', gap: '5px' }} onClick={handleDelete}>
                    <Trash2 size={16} /> Delete LZ
                  </button>
                )}
                
                {!editForm.isCustom && (() => {
                  try {
                    const storedZones = JSON.parse(localStorage.getItem('userCustomZones') || '[]');
                    const hasOverride = storedZones.some(z => z.id === editForm.id);
                    if (hasOverride) {
                      return (
                        <button 
                          type="button" 
                          className="btn btn-outline" 
                          style={{ color: '#b45309', borderColor: '#b45309', display: 'flex', alignItems: 'center', gap: '5px' }} 
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove all custom notes and revert ${editForm.id} back to its official database condition?`)) {
                              const updatedZones = storedZones.filter(z => z.id !== editForm.id);
                              localStorage.setItem('userCustomZones', JSON.stringify(updatedZones));
                              loadData();
                              setSelectedLoc(null);
                              setEditForm(null);
                            }
                          }}
                        >
                          Restore Official Data
                        </button>
                      );
                    }
                  } catch {}
                  return null;
                })()}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {JSON.stringify(editForm) !== JSON.stringify(selectedLoc) && (
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => {
                      setEditForm({ ...selectedLoc });
                      setAddressQuery(selectedLoc.addressStreet || '');
                      if (selectedLoc.coordinates) {
                        const parts = selectedLoc.coordinates.split(',').map(p => parseFloat(p.trim()));
                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                          setMapCenter(parts);
                        }
                      }
                      setSaved(false);
                    }}
                  >
                    Discard Changes
                  </button>
                )}
                <SaveButton triggerSave={saved} onClick={handleSave}>Save Location</SaveButton>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LocationsView;
