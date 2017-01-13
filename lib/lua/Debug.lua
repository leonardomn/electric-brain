require('torch')
require('nn')

local Debug, parent = torch.class('nn.Debug', 'nn.Module')

function Debug:__init(name)
    parent.__init(self)
    self.name = name
end

function Debug:updateOutput(input)
    print(self.name)
    print(input)
    self.output = input
    return self.output
end


function Debug:updateGradInput(input, gradOutput)
    self.gradInput = gradOutput
    return self.gradInput
end

function Debug:clearState()
    -- don't call set because it might reset referenced tensors
    local function clear(f)
        if self[f] then
            if torch.isTensor(self[f]) then
                self[f] = self[f].new()
            elseif type(self[f]) == 'table' then
                self[f] = {}
            else
                self[f] = nil
            end
        end
    end
    clear('output')
    clear('gradInput')
    return self
end